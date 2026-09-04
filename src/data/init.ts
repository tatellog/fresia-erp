import { db } from './db'
import { uid } from './ids'
import { migrateFromV1 } from './migrate'
import { seed } from './seed'
import { deleteProduct, productLine, saveProduct } from '../services/catalog'
import { INITIAL_INVESTMENTS } from '../services/investments'

/** versión del catálogo sembrado; subirla reemplaza catálogos viejos sin movimientos */
export const SEED_VERSION = '15'

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

/**
 * Pide al navegador conservar los datos locales aunque el dispositivo ande
 * corto de espacio. Sin esto, IndexedDB puede borrarse bajo presión de disco.
 * Devuelve si la persistencia quedó garantizada.
 */
export async function ensurePersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false
    return (await navigator.storage.persisted()) || (await navigator.storage.persist())
  } catch {
    return false
  }
}

/** arranque de la base: migra desde la v1 si existe, o siembra el catálogo real */
export async function initDb() {
  void ensurePersistentStorage()
  await db.open()

  if (!(await db.meta.get('initialized'))) {
    const oldDbs = (await indexedDB.databases?.()) ?? []
    if (oldDbs.some(d => d.name === 'fresia')) await migrateFromV1()
    else if ((await db.products.count()) === 0) await seed()
    await db.meta.put({ key: 'initialized', value: '1' })
  }

  // los combos salieron del menú: limpiar catálogos viejos que aún los tengan
  const combos = await db.products.filter(p => /combo/i.test(p.name)).toArray()
  for (const c of combos) await deleteProduct(c.id)

  // la Brûlée ahora lleva 2 toppings incluidos: dar el grupo a catálogos viejos
  const brulees = await db.products.filter(p => !p.toppingGroup && productLine(p) === 'brulee').toArray()
  for (const b of brulees) await saveProduct({ ...b, toppingGroup: 'clasica' }, b)

  // el Waffle lleva el Turín y las mermeladas dentro de sus 2 incluidos:
  // dárselo también a los catálogos que ya estaban en el dispositivo
  const waffles = await db.products.filter(p => !p.freePremium?.length && productLine(p) === 'waffle').toArray()
  if (waffles.length) {
    const libres = (await db.ingredients.filter(i => /tur[ií]n|mermelada/i.test(i.name)).toArray()).map(i => i.id)
    if (libres.length) for (const w of waffles) await saveProduct({ ...w, freePremium: libres }, w)
  }

  // la línea de chocolate ahora se llama Choco Crema: renombrar catálogos viejos
  const chocos = await db.products.filter(p => /^chocolate ·/i.test(p.name)).toArray()
  for (const c of chocos) await saveProduct({ ...c, name: c.name.replace(/^chocolate ·/i, 'Choco Crema ·') }, c)

  // gastos de apertura reales: se cargan una sola vez en cada dispositivo
  if (!(await db.meta.get('investmentsSeeded')) && (await db.investments.count()) === 0) {
    const base = Date.now()
    await db.investments.bulkAdd(INITIAL_INVESTMENTS.map((inv, i) => ({ ...inv, id: uid(), ts: base + i })))
    await db.meta.put({ key: 'investmentsSeeded', value: '1' })
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
