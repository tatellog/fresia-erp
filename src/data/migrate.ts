import Dexie from 'dexie'
import { db } from './db'
import { uid } from './ids'
import type { SaleItem } from './types'

/**
 * Migra la base v1 ('fresia', ids numéricos autoincrementales) a la v2
 * ('fresia2', UUIDs), re-vinculando recetas, tickets y sesiones de caja.
 * Al terminar elimina la base vieja.
 */
export async function migrateFromV1() {
  const old = new Dexie('fresia')
  old.version(1).stores({
    ingredients: '++id, name',
    products: '++id, name, sort',
    sales: '++id, ts, sessionId',
    purchases: '++id, ts, ingredientId',
    wastes: '++id, ts, ingredientId',
    expenses: '++id, ts, sessionId',
    cashSessions: '++id, openTs',
  })
  await old.open()
  const [ingredients, products, sales, purchases, wastes, expenses, cashSessions] = await Promise.all([
    old.table('ingredients').toArray(), old.table('products').toArray(), old.table('sales').toArray(),
    old.table('purchases').toArray(), old.table('wastes').toArray(), old.table('expenses').toArray(),
    old.table('cashSessions').toArray(),
  ])
  old.close()

  const ingId = new Map(ingredients.map(i => [i.id as number, uid()]))
  const prodId = new Map(products.map(p => [p.id as number, uid()]))
  const sessId = new Map(cashSessions.map(s => [s.id as number, uid()]))
  const mapIng = (n: number) => ingId.get(n) ?? uid()

  await db.transaction('rw', db.tables, async () => {
    await db.ingredients.bulkAdd(ingredients.map(i => ({ ...i, id: ingId.get(i.id)! })))
    await db.products.bulkAdd(products.map(p => ({
      ...p,
      id: prodId.get(p.id)!,
      recipe: (p.recipe ?? []).map((r: { ingredientId: number; qty: number }) => ({ ingredientId: mapIng(r.ingredientId), qty: r.qty })),
    })))
    await db.sales.bulkAdd(sales.map(s => ({
      ...s,
      id: uid(),
      sessionId: s.sessionId != null ? sessId.get(s.sessionId) : undefined,
      items: (s.items ?? []).map((it: { productId: number } & Omit<SaleItem, 'productId'>) => ({ ...it, productId: prodId.get(it.productId) ?? uid() })),
    })))
    await db.purchases.bulkAdd(purchases.map(p => ({ ...p, id: uid(), ingredientId: mapIng(p.ingredientId) })))
    await db.wastes.bulkAdd(wastes.map(w => ({ ...w, id: uid(), ingredientId: mapIng(w.ingredientId) })))
    await db.expenses.bulkAdd(expenses.map(e => ({ ...e, id: uid(), sessionId: e.sessionId != null ? sessId.get(e.sessionId) : undefined })))
    await db.cashSessions.bulkAdd(cashSessions.map(s => ({ ...s, id: sessId.get(s.id)! })))
  })
  await Dexie.delete('fresia')
}
