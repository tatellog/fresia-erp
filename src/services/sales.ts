import { db } from '../data/db'
import { uid } from '../data/ids'
import type { Ingredient, Payment, Product, SaleItem } from '../data/types'
import { round2 } from '../lib/format'
import { productCost } from './costing'
import { enqueue } from './outbox'

/** toppings incluidos en el precio de cada vaso */
export const INCLUDED_TOPPINGS = 2
/** precio de cada topping adicional después de los incluidos */
export const EXTRA_TOPPING_PRICE = 15

export interface CartLine {
  product: Product
  qty: number
  /** toppings elegidos (solo productos con toppingGroup) */
  toppings: Ingredient[]
  /** extras agregados al vaso (productos con extraScope) */
  extras: Product[]
}

/** precio unitario cobrado: base + toppings adicionales + extras */
export function lineUnitPrice(line: CartLine): number {
  const extraToppings = Math.max(0, line.toppings.length - INCLUDED_TOPPINGS)
  const extrasTotal = line.extras.reduce((s, e) => s + e.price, 0)
  return round2(line.product.price + extraToppings * EXTRA_TOPPING_PRICE + extrasTotal)
}

/** costo unitario de insumos: receta base + porciones de toppings + recetas de extras */
function lineUnitCost(line: CartLine, ingredients: Map<string, Ingredient>): number {
  const toppingsCost = line.toppings.reduce((s, t) => s + t.cost * (t.portion ?? 0), 0)
  const extrasCost = line.extras.reduce((s, e) => s + productCost(e, ingredients), 0)
  return round2(productCost(line.product, ingredients) + toppingsCost + extrasCost)
}

/**
 * Registra la venta y descuenta insumos (receta base + toppings + extras)
 * en una sola transacción. El stock puede quedar negativo a propósito: en
 * el punto de venta nunca se bloquea una venta real; el faltante se
 * corrige con compras o mermas.
 */
export async function checkout(cart: CartLine[], payment: Payment): Promise<string> {
  return db.transaction('rw', [db.sales, db.ingredients, db.cashSessions, db.outbox, db.meta, db.employees], async () => {
    const ingredients = new Map((await db.ingredients.toArray()).map(i => [i.id, i]))
    const session = await db.cashSessions.filter(s => s.closeTs === undefined).last()
    const activeId = (await db.meta.get('activeEmployeeId'))?.value
    const employee = activeId ? await db.employees.get(activeId) : undefined

    const items: SaleItem[] = cart.map(line => ({
      productId: line.product.id,
      name: line.product.name,
      qty: line.qty,
      price: lineUnitPrice(line),
      cost: lineUnitCost(line, ingredients),
      toppings: line.toppings.length ? line.toppings.map(t => t.name) : undefined,
      extras: line.extras.length ? line.extras.map(e => e.name) : undefined,
    }))

    // consumo de insumos: receta base + porciones de toppings + recetas de extras
    const usage = new Map<string, number>()
    const use = (ingredientId: string, qty: number) =>
      usage.set(ingredientId, (usage.get(ingredientId) ?? 0) + qty)
    for (const line of cart) {
      for (const r of line.product.recipe) use(r.ingredientId, r.qty * line.qty)
      for (const t of line.toppings) use(t.id, (t.portion ?? 0) * line.qty)
      for (const e of line.extras)
        for (const r of e.recipe) use(r.ingredientId, r.qty * line.qty)
    }
    for (const [ingredientId, qty] of usage) {
      const ing = ingredients.get(ingredientId)
      if (!ing) continue
      const updated = { ...ing, stock: round2(ing.stock - qty) }
      await db.ingredients.put(updated)
      await enqueue('ingredients', 'upsert', updated)
    }

    const sale = {
      id: uid(),
      ts: Date.now(),
      items,
      total: round2(items.reduce((s, i) => s + i.price * i.qty, 0)),
      cost: round2(items.reduce((s, i) => s + i.cost * i.qty, 0)),
      payment,
      sessionId: session?.id,
      employeeName: employee?.name,
    }
    await db.sales.add(sale)
    await enqueue('sales', 'upsert', sale)
    return sale.id
  })
}
