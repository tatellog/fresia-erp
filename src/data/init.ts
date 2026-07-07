import { db } from './db'
import { migrateFromV1 } from './migrate'
import { seed } from './seed'

/** versión del catálogo sembrado; subirla reemplaza catálogos viejos sin movimientos */
export const SEED_VERSION = '6'

/**
 * Reemplaza menú e insumos por el catálogo oficial vigente, conservando
 * ventas, compras, cortes y personal. Los stocks vuelven a 0 (se cargan
 * con compras). Para dispositivos con actividad que quieren el menú nuevo.
 */
export async function updateCatalog() {
  await db.transaction('rw', [db.ingredients, db.products], async () => {
    await db.ingredients.clear()
    await db.products.clear()
  })
  await seed()
  await db.meta.put({ key: 'seedVersion', value: SEED_VERSION })
}

/** ¿el catálogo local es de una versión anterior al vigente? */
export async function catalogOutdated(): Promise<boolean> {
  return (await db.meta.get('seedVersion'))?.value !== SEED_VERSION
}

/** arranque de la base: migra desde la v1 si existe, o siembra el catálogo real */
export async function initDb() {
  await db.open()

  if (!(await db.meta.get('initialized'))) {
    const oldDbs = (await indexedDB.databases?.()) ?? []
    if (oldDbs.some(d => d.name === 'fresia')) await migrateFromV1()
    else if ((await db.products.count()) === 0) await seed()
    await db.meta.put({ key: 'initialized', value: '1' })
  }

  // catálogo de versión anterior y sin movimientos: reemplazar automáticamente.
  // Con movimientos NO se toca (y la versión queda marcada como vieja para
  // que Ajustes ofrezca "Actualizar menú").
  if (await catalogOutdated()) {
    const hasActivity = (await db.sales.count()) + (await db.purchases.count()) > 0
    if (!hasActivity) {
      await db.transaction('rw', [db.ingredients, db.products, db.outbox], async () => {
        await db.ingredients.clear()
        await db.products.clear()
        await db.outbox.clear()
      })
      await seed()
      await db.meta.put({ key: 'seedVersion', value: SEED_VERSION })
    }
  }
}
