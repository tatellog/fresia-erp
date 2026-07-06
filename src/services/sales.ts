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
}

/** precio unitario cobrado: base + toppings adicionales */
export function lineUnitPrice(line: CartLine): number {
  const extra = Math.max(0, line.toppings.length - INCLUDED_TOPPINGS)
  return round2(line.product.price + extra * EXTRA_TOPPING_PRICE)
}

/** costo unitario de insumos: receta base + porción de cada topping elegido */
function lineUnitCost(line: CartLine, ingredients: Map<string, Ingredient>): number {
  const toppingsCost = line.toppings.reduce((s, t) => s + t.cost * (t.portion ?? 0), 0)
  return round2(productCost(line.product, ingredients) + toppingsCost)
}

/**
 * Registra la venta y descuenta insumos (receta base + toppings) en una sola
 * transacción. El stock puede quedar negativo a propósito: en el punto de
 * venta nunca se bloquea una venta real; el faltante se corrige con compras
 * o mermas.
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
    }))

    // consumo de insumos: receta base + porciones de toppings
    const usage = new Map<string, number>()
    const use = (ingredientId: string, qty: number) =>
      usage.set(ingredientId, (usage.get(ingredientId) ?? 0) + qty)
    for (const line of cart) {
      for (const r of line.product.recipe) use(r.ingredientId, r.qty * line.qty)
      for (const t of line.toppings) use(t.id, (t.portion ?? 0) * line.qty)
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
