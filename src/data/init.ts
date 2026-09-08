import { db } from './db'
import { uid } from './ids'
import { migrateFromV1 } from './migrate'
import { seed } from './seed'
import { deleteProduct, productLine, saveProduct } from '../services/catalog'
import { INITIAL_INVESTMENTS } from '../services/investments'
import { ensureToppingLists } from '../services/toppingLists'

/** versión del catálogo sembrado; subirla reemplaza catálogos viejos sin movimientos */
export const SEED_VERSION = '17'

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

  // las listas de toppings son editables desde el menú; las dos originales siempre existen
  await ensureToppingLists()

  // Consolidación única del catálogo (septiembre 2026): cada dispositivo
  // había sembrado el menú con ids al azar y, al bajar de la nube, se
  // juntaban las copias. Se vuelve a sembrar con ids estables (los mismos
  // en todos los dispositivos) conservando las fotos subidas a mano.
  if (!(await db.meta.get('catalogConsolidated'))) {
    const fotos = new Map((await db.products.toArray()).filter(p => p.photo).map(p => [p.name, p.photo!]))
    await updateCatalog()
    for (const p of await db.products.toArray()) {
      const photo = fotos.get(p.name)
      if (photo) await saveProduct({ ...p, photo }, p)
    }
    await db.meta.put({ key: 'catalogConsolidated', value: '1' })
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

  // la línea Granada (granada desgranada + crema, precios de Clásica) se agrega
  // a los catálogos que ya tienen movimientos, clonando cada tamaño de la Clásica
  if (!(await db.products.filter(p => productLine(p) === 'granada').count())) {
    const clasicas = await db.products.filter(p => productLine(p) === 'clasica' && /Chico|Median|Grande/.test(p.name)).toArray()
    const granada = await db.ingredients.filter(i => /granada/i.test(i.name)).first()
    const fresa = await db.ingredients.filter(i => /^fresa/i.test(i.name)).first()
    if (clasicas.length && granada) {
      let sort = (await db.products.count()) + 1
      for (const c of clasicas) {
        const { id: _id, sort: _sort, ...base } = c
        await saveProduct({
          ...base,
          name: c.name.replace(/^Clásica/i, 'Granada'),
          line: 'granada',
          photo: undefined,
          recipe: c.recipe.map(r => (fresa && r.ingredientId === fresa.id ? { ...r, ingredientId: granada.id } : r)),
        }, undefined, sort++)
      }
    }
  }

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
