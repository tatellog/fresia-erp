import { db } from './db'
import { migrateFromV1 } from './migrate'
import { seed } from './seed'

/** versión del catálogo sembrado; subirla reemplaza catálogos viejos sin movimientos */
const SEED_VERSION = '3'

/** arranque de la base: migra desde la v1 si existe, o siembra el catálogo real */
export async function initDb() {
  await db.open()

  if (!(await db.meta.get('initialized'))) {
    const oldDbs = (await indexedDB.databases?.()) ?? []
    if (oldDbs.some(d => d.name === 'fresia')) await migrateFromV1()
    else if ((await db.products.count()) === 0) await seed()
    await db.meta.put({ key: 'initialized', value: '1' })
  }

  // instalaciones con el catálogo de ejemplo y sin movimientos: reemplazar por el real
  if ((await db.meta.get('seedVersion'))?.value !== SEED_VERSION) {
    const hasActivity = (await db.sales.count()) + (await db.purchases.count()) > 0
    if (!hasActivity) {
      await db.transaction('rw', [db.ingredients, db.products, db.outbox], async () => {
        await db.ingredients.clear()
        await db.products.clear()
        await db.outbox.clear()
      })
      await seed()
    }
    await db.meta.put({ key: 'seedVersion', value: SEED_VERSION })
  }
}
