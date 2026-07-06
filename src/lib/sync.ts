import { createClient } from '@supabase/supabase-js'
import { db, type OutboxEntry, type SyncTable } from '../db'

// Proyecto Supabase de Fresia. La llave publishable es pública por diseño
// (la seguridad la pone RLS: solo usuarios autenticados leen/escriben).
export const SUPABASE_URL = 'https://vcvxotvpmmuwxekruiiq.supabase.co'
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY ?? ''

export const cloudEnabled = SUPABASE_KEY.length > 0

export const supabase = createClient(SUPABASE_URL, cloudEnabled ? SUPABASE_KEY : 'sin-configurar')

const iso = (ts: unknown) => (typeof ts === 'number' ? new Date(ts).toISOString() : null)

/** nombre de tabla y forma de fila en Postgres (snake_case) */
const toCloud: Record<SyncTable, { table: string; map: (r: Record<string, unknown>, branch: string) => Record<string, unknown> }> = {
  ingredients: {
    table: 'ingredients',
    map: (r, branch) => ({ id: r.id, name: r.name, unit: r.unit, stock: r.stock, cost: r.cost, min_stock: r.minStock, branch, updated_at: new Date().toISOString() }),
  },
  products: {
    table: 'products',
    map: (r, branch) => ({ id: r.id, name: r.name, emoji: r.emoji, price: r.price, recipe: r.recipe, active: r.active, sort: r.sort, branch, updated_at: new Date().toISOString() }),
  },
  sales: {
    table: 'sales',
    map: (r, branch) => ({ id: r.id, ts: iso(r.ts), items: r.items, total: r.total, cost: r.cost, payment: r.payment, session_id: r.sessionId ?? null, branch }),
  },
  purchases: {
    table: 'purchases',
    map: (r, branch) => ({ id: r.id, ts: iso(r.ts), ingredient_id: r.ingredientId, ingredient_name: r.ingredientName, qty: r.qty, total_cost: r.totalCost, note: r.note ?? null, branch }),
  },
  wastes: {
    table: 'wastes',
    map: (r, branch) => ({ id: r.id, ts: iso(r.ts), ingredient_id: r.ingredientId, ingredient_name: r.ingredientName, qty: r.qty, reason: r.reason, branch }),
  },
  expenses: {
    table: 'expenses',
    map: (r, branch) => ({ id: r.id, ts: iso(r.ts), concept: r.concept, amount: r.amount, session_id: r.sessionId ?? null, branch }),
  },
  cashSessions: {
    table: 'cash_sessions',
    map: (r, branch) => ({ id: r.id, open_ts: iso(r.openTs), close_ts: iso(r.closeTs), open_amount: r.openAmount, close_amount: r.closeAmount ?? null, expected: r.expected ?? null, branch }),
  },
}

export async function getBranch(): Promise<string> {
  return (await db.meta.get('branch'))?.value || 'Principal'
}

export async function setBranch(name: string) {
  await db.meta.put({ key: 'branch', value: name.trim() || 'Principal' })
}

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
