import { db } from '../data/db'
import { DOMAIN_TABLES } from '../data/types'

/** respaldo completo de la base como JSON (todas las tablas del dominio) */
export async function exportBackup(): Promise<string> {
  const data: Record<string, unknown> = { v: 2, exportedAt: Date.now() }
  for (const table of DOMAIN_TABLES) data[table] = await db.table(table).toArray()
  return JSON.stringify(data)
}

export async function importBackup(json: string) {
  const data = JSON.parse(json)
  if (data.v !== 2) throw new Error('Formato de respaldo no reconocido')
  await db.transaction('rw', db.tables, async () => {
    for (const table of DOMAIN_TABLES) {
      await db.table(table).clear()
      await db.table(table).bulkAdd(data[table] ?? [])
    }
    await db.outbox.clear()
  })
}
