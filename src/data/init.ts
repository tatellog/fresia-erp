import { db } from './db'
import { migrateFromV1 } from './migrate'
import { seed } from './seed'

/** arranque de la base: migra desde la v1 si existe, o siembra datos iniciales */
export async function initDb() {
  await db.open()
  if (await db.meta.get('initialized')) return
  const oldDbs = (await indexedDB.databases?.()) ?? []
  if (oldDbs.some(d => d.name === 'fresia')) await migrateFromV1()
  else if ((await db.products.count()) === 0) await seed()
  await db.meta.put({ key: 'initialized', value: '1' })
}
