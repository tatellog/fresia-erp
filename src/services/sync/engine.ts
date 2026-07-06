import { db } from '../../data/db'
import type { OutboxEntry, SyncTable } from '../../data/types'
import { cloudEnabled, supabase } from './client'
import { toCloud } from './mapping'
import { getBranch } from './settings'

let flushing = false

/**
 * Sube la cola de cambios pendientes a Supabase en orden, por lotes.
 * Idempotente: todo es upsert por id, así que reintentar es seguro.
 */
export async function flushOutbox(): Promise<{ pushed: number; error?: string }> {
  if (!cloudEnabled || !navigator.onLine || flushing) return { pushed: 0 }
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { pushed: 0 }

  flushing = true
  let pushed = 0
  try {
    const branch = await getBranch()
    for (;;) {
      const batch = await db.outbox.orderBy('seq').limit(500).toArray()
      if (batch.length === 0) break

      // agrupa entradas consecutivas de la misma tabla y operación
      const groups: { table: SyncTable; op: OutboxEntry['op']; entries: OutboxEntry[] }[] = []
      for (const e of batch) {
        const last = groups[groups.length - 1]
        if (last && last.table === e.table && last.op === e.op) last.entries.push(e)
        else groups.push({ table: e.table, op: e.op, entries: [e] })
      }

      for (const g of groups) {
        const { table, map } = toCloud[g.table]
        if (g.op === 'upsert') {
          // si el mismo id aparece varias veces en el grupo, gana el último
          const rows = new Map(g.entries.map(e => [e.row.id as string, map(e.row, branch)]))
          const { error } = await supabase.from(table).upsert([...rows.values()])
          if (error) return { pushed, error: error.message }
        } else {
          const ids = g.entries.map(e => e.row.id as string)
          const { error } = await supabase.from(table).delete().in('id', ids)
          if (error) return { pushed, error: error.message }
        }
        await db.outbox.bulkDelete(g.entries.map(e => e.seq))
        pushed += g.entries.length
      }
    }
    await db.meta.put({ key: 'lastSyncAt', value: String(Date.now()) })
    return { pushed }
  } catch (e) {
    return { pushed, error: e instanceof Error ? e.message : String(e) }
  } finally {
    flushing = false
  }
}

/** dispara la sincronización en segundo plano: al volver la red, al abrir la app y cada 30 s */
export function startSync() {
  if (!cloudEnabled) return
  window.addEventListener('online', () => void flushOutbox())
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void flushOutbox()
  })
  setInterval(() => void flushOutbox(), 30_000)
  void flushOutbox()
}
