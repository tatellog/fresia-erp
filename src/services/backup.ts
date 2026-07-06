import { db } from '../data/db'
import { DOMAIN_TABLES } from '../data/types'

/** respaldo completo de la base como JSON */
export async function exportBackup(): Promise<string> {
  const [ingredients, products, sales, purchases, wastes, expenses, cashSessions] = await Promise.all([
    db.ingredients.toArray(), db.products.toArray(), db.sales.toArray(),
    db.purchases.toArray(), db.wastes.toArray(), db.expenses.toArray(), db.cashSessions.toArray(),
  ])
  return JSON.stringify({ v: 2, exportedAt: Date.now(), ingredients, products, sales, purchases, wastes, expenses, cashSessions })
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
