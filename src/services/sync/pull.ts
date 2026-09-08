import { db } from '../../data/db'
import { DOMAIN_TABLES, type SyncTable } from '../../data/types'
import { cloudEnabled, supabase } from './client'
import { toCloud } from './mapping'
import { fromCloud } from './restore'
import { getBranch } from './settings'

type CloudRow = Record<string, unknown>

/** lápida: fila borrada en la nube que hay que quitar aquí */
export interface Tombstone {
  table: SyncTable
  id: string
}

/**
 * Se vuelve a pedir un minuto de traslape: las filas ya aplicadas se
 * vuelven a escribir igual, y así no se pierde nada que haya quedado
 * confirmándose en el servidor justo cuando se consultó.
 */
const TRASLAPE_MS = 60_000

let pulling = false

/**
 * Aplica en la base local lo que llegó de la nube. Las filas con cambios
 * locales pendientes de subir se respetan: ese cambio se sube después y
 * regresa por aquí en la siguiente vuelta. Los PIN del personal nunca
 * viajan a la nube, así que se conservan los locales.
 */
export async function mergeIntoLocal(rows: Partial<Record<SyncTable, CloudRow[]>>, tombstones: Tombstone[]) {
  await db.transaction('rw', db.tables, async () => {
    const pendientes = new Set((await db.outbox.toArray()).map(e => `${e.table}:${e.row.id}`))
    // primero las bajas: una fila reinsertada en la nube llega después y gana
    for (const t of tombstones) {
      if (pendientes.has(`${t.table}:${t.id}`)) continue
      await db.table(t.table).delete(t.id)
    }
    for (const table of DOMAIN_TABLES) {
      const nuevas = (rows[table] ?? []).filter(r => !pendientes.has(`${table}:${r.id}`))
      if (nuevas.length === 0) continue
      if (table === 'employees') {
        const pins = new Map((await db.employees.toArray()).map(e => [e.id, e.pin]))
        for (const e of nuevas) e.pin = pins.get(e.id as string) ?? ''
      }
      await db.table(table).bulkPut(nuevas)
    }
  })
}

/** trae todas las páginas de una consulta de Supabase */
async function todas(table: string, branch: string, campo: string, desde: string | null): Promise<CloudRow[]> {
  const rows: CloudRow[] = []
  for (let from = 0; ; from += 1000) {
    let q = supabase.from(table).select('*').eq('branch', branch).order(campo, { ascending: true }).range(from, from + 999)
    if (desde) q = q.gte(campo, desde)
    const { data, error } = await q
    if (error) throw new Error(error.message)
    rows.push(...(data ?? []))
    if (!data || data.length < 1000) break
  }
  return rows
}

/**
 * Baja de la nube lo que cambió desde la última vez y lo mezcla con lo
 * local. El corte se guarda con la hora del servidor (la mayor vista), no
 * con la del dispositivo, para que un reloj desfasado no deje huecos.
 */
export async function pullFromCloud(): Promise<{ pulled: number; error?: string }> {
  if (!cloudEnabled || !navigator.onLine || pulling) return { pulled: 0 }
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { pulled: 0 }

  pulling = true
  try {
    const branch = await getBranch()
    const desde = (await db.meta.get('lastPullAt'))?.value || null
    let mayor = desde ? new Date(desde).getTime() : 0

    const rows: Partial<Record<SyncTable, CloudRow[]>> = {}
    let pulled = 0
    for (const table of DOMAIN_TABLES) {
      const crudas = await todas(toCloud[table].table, branch, 'updated_at', desde)
      for (const r of crudas) mayor = Math.max(mayor, new Date(r.updated_at as string).getTime())
      rows[table] = crudas.map(fromCloud[table])
      pulled += crudas.length
    }

    const porTabla = new Map(DOMAIN_TABLES.map(t => [toCloud[t].table, t]))
    const lapidas = await todas('deleted_rows', branch, 'deleted_at', desde)
    const tombstones: Tombstone[] = []
    for (const l of lapidas) {
      mayor = Math.max(mayor, new Date(l.deleted_at as string).getTime())
      const table = porTabla.get(l.table_name as string)
      if (table) tombstones.push({ table, id: l.id as string })
    }

    await mergeIntoLocal(rows, tombstones)
    if (mayor > 0) await db.meta.put({ key: 'lastPullAt', value: new Date(mayor - TRASLAPE_MS).toISOString() })
    await db.meta.put({ key: 'lastSyncAt', value: String(Date.now()) })
    return { pulled: pulled + tombstones.length }
  } catch (e) {
    return { pulled: 0, error: e instanceof Error ? e.message : String(e) }
  } finally {
    pulling = false
  }
}
