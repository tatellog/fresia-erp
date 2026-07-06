import { db } from '../data/db'
import { DOMAIN_TABLES, type SyncTable } from '../data/types'

/** encola un cambio para subirlo a la nube (llamar dentro de la misma transacción que lo guarda) */
export const enqueue = (table: SyncTable, op: 'upsert' | 'delete', row: object) =>
  db.outbox.add({ table, op, row: row as Record<string, unknown>, ts: Date.now() } as never)

/** encola TODO el contenido local (primer login o resincronización manual) */
export async function fullResync() {
  await db.transaction('rw', db.tables, async () => {
    await db.outbox.clear()
    for (const table of DOMAIN_TABLES) {
      const rows = await db.table(table).toArray()
      for (const row of rows) await enqueue(table, 'upsert', row)
    }
  })
}
