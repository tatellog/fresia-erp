import { db, type Ingredient, type Payment, type Product, type SaleItem } from '../db'
import { round2 } from './format'

/** costo de insumos de una unidad del producto, con costos actuales */
export function productCost(product: Product, ingredients: Map<number, Ingredient>): number {
  return round2(
    product.recipe.reduce((sum, r) => {
      const ing = ingredients.get(r.ingredientId)
      return sum + (ing ? ing.cost * r.qty : 0)
    }, 0),
  )
}

export interface CartLine {
  product: Product
  qty: number
}

/**
 * Registra la venta y descuenta insumos según receta, en una sola transacción.
 * El stock puede quedar negativo a propósito: en el punto de venta nunca se
 * bloquea una venta real; el faltante se corrige con compras o mermas.
 */
export async function checkout(cart: CartLine[], payment: Payment): Promise<number> {
  return db.transaction('rw', [db.sales, db.ingredients, db.cashSessions], async () => {
    const ingredients = new Map((await db.ingredients.toArray()).map(i => [i.id, i]))
    const session = await db.cashSessions.filter(s => s.closeTs === undefined).last()

    const items: SaleItem[] = cart.map(({ product, qty }) => ({
      productId: product.id,
      name: product.name,
      qty,
      price: product.price,
      cost: productCost(product, ingredients),
    }))

    // descuenta insumos
    const usage = new Map<number, number>()
    for (const { product, qty } of cart)
      for (const r of product.recipe)
        usage.set(r.ingredientId, (usage.get(r.ingredientId) ?? 0) + r.qty * qty)
    for (const [ingredientId, qty] of usage) {
      const ing = ingredients.get(ingredientId)
      if (ing) await db.ingredients.update(ingredientId, { stock: round2(ing.stock - qty) })
    }

    return db.sales.add({
      ts: Date.now(),
      items,
      total: round2(items.reduce((s, i) => s + i.price * i.qty, 0)),
      cost: round2(items.reduce((s, i) => s + i.cost * i.qty, 0)),
      payment,
      sessionId: session?.id,
    })
  })
}

/** compra de insumo: sube stock y recalcula costo promedio ponderado */
export async function registerPurchase(ingredientId: number, qty: number, totalCost: number, note?: string) {
  return db.transaction('rw', [db.ingredients, db.purchases], async () => {
    const ing = await db.ingredients.get(ingredientId)
    if (!ing) throw new Error('Insumo no encontrado')
    const oldValue = Math.max(ing.stock, 0) * ing.cost
    const newStock = ing.stock + qty
    const newCost = newStock > 0 ? (oldValue + totalCost) / (Math.max(ing.stock, 0) + qty) : ing.cost
    await db.ingredients.update(ingredientId, { stock: round2(newStock), cost: round2(newCost * 100) / 100 })
    await db.purchases.add({ ts: Date.now(), ingredientId, ingredientName: ing.name, qty, totalCost, note })
  })
}

/** merma: baja stock y deja registro del motivo */
export async function registerWaste(ingredientId: number, qty: number, reason: string) {
  return db.transaction('rw', [db.ingredients, db.wastes], async () => {
    const ing = await db.ingredients.get(ingredientId)
    if (!ing) throw new Error('Insumo no encontrado')
    await db.ingredients.update(ingredientId, { stock: round2(ing.stock - qty) })
    await db.wastes.add({ ts: Date.now(), ingredientId, ingredientName: ing.name, qty, reason })
  })
}

/** respaldo completo de la base como JSON */
export async function exportBackup(): Promise<string> {
  const [ingredients, products, sales, purchases, wastes, expenses, cashSessions] = await Promise.all([
    db.ingredients.toArray(), db.products.toArray(), db.sales.toArray(),
    db.purchases.toArray(), db.wastes.toArray(), db.expenses.toArray(), db.cashSessions.toArray(),
  ])
  return JSON.stringify({ v: 1, exportedAt: Date.now(), ingredients, products, sales, purchases, wastes, expenses, cashSessions })
}

export async function importBackup(json: string) {
  const data = JSON.parse(json)
  if (data.v !== 1) throw new Error('Formato de respaldo no reconocido')
  await db.transaction('rw', db.tables, async () => {
    for (const t of db.tables) await t.clear()
    await db.ingredients.bulkAdd(data.ingredients)
    await db.products.bulkAdd(data.products)
    await db.sales.bulkAdd(data.sales)
    await db.purchases.bulkAdd(data.purchases)
    await db.wastes.bulkAdd(data.wastes)
    await db.expenses.bulkAdd(data.expenses)
    await db.cashSessions.bulkAdd(data.cashSessions)
  })
}
