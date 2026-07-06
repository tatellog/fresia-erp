import { db } from '../data/db'
import { uid } from '../data/ids'
import type { Payment, Product, SaleItem } from '../data/types'
import { round2 } from '../lib/format'
import { productCost } from './costing'
import { enqueue } from './outbox'

export interface CartLine {
  product: Product
  qty: number
}

/**
 * Registra la venta y descuenta insumos según receta, en una sola transacción.
 * El stock puede quedar negativo a propósito: en el punto de venta nunca se
 * bloquea una venta real; el faltante se corrige con compras o mermas.
 */
export async function checkout(cart: CartLine[], payment: Payment): Promise<string> {
  return db.transaction('rw', [db.sales, db.ingredients, db.cashSessions, db.outbox], async () => {
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
    const usage = new Map<string, number>()
    for (const { product, qty } of cart)
      for (const r of product.recipe)
        usage.set(r.ingredientId, (usage.get(r.ingredientId) ?? 0) + r.qty * qty)
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
    }
    await db.sales.add(sale)
    await enqueue('sales', 'upsert', sale)
    return sale.id
  })
}
