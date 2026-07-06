import { db } from '../data/db'
import { uid } from '../data/ids'
import type { Ingredient } from '../data/types'
import { round2 } from '../lib/format'
import { enqueue } from './outbox'

/** compra de insumo: sube stock y recalcula costo promedio ponderado */
export async function registerPurchase(ingredientId: string, qty: number, totalCost: number, note?: string) {
  return db.transaction('rw', [db.ingredients, db.purchases, db.outbox], async () => {
    const ing = await db.ingredients.get(ingredientId)
    if (!ing) throw new Error('Insumo no encontrado')
    const oldValue = Math.max(ing.stock, 0) * ing.cost
    const newStock = ing.stock + qty
    const newCost = newStock > 0 ? (oldValue + totalCost) / (Math.max(ing.stock, 0) + qty) : ing.cost
    const updated = { ...ing, stock: round2(newStock), cost: round2(newCost) }
    await db.ingredients.put(updated)
    await enqueue('ingredients', 'upsert', updated)
    const purchase = { id: uid(), ts: Date.now(), ingredientId, ingredientName: ing.name, qty, totalCost, note }
    await db.purchases.add(purchase)
    await enqueue('purchases', 'upsert', purchase)
  })
}

/** merma: baja stock y deja registro del motivo */
export async function registerWaste(ingredientId: string, qty: number, reason: string) {
  return db.transaction('rw', [db.ingredients, db.wastes, db.outbox], async () => {
    const ing = await db.ingredients.get(ingredientId)
    if (!ing) throw new Error('Insumo no encontrado')
    const updated = { ...ing, stock: round2(ing.stock - qty) }
    await db.ingredients.put(updated)
    await enqueue('ingredients', 'upsert', updated)
    const waste = { id: uid(), ts: Date.now(), ingredientId, ingredientName: ing.name, qty, reason }
    await db.wastes.add(waste)
    await enqueue('wastes', 'upsert', waste)
  })
}

export async function saveIngredient(data: Omit<Ingredient, 'id' | 'stock'>, existing?: Ingredient) {
  return db.transaction('rw', [db.ingredients, db.outbox], async () => {
    const row: Ingredient = existing ? { ...existing, ...data } : { ...data, id: uid(), stock: 0 }
    await db.ingredients.put(row)
    await enqueue('ingredients', 'upsert', row)
  })
}

export async function deleteIngredient(id: string) {
  return db.transaction('rw', [db.ingredients, db.outbox], async () => {
    await db.ingredients.delete(id)
    await enqueue('ingredients', 'delete', { id })
  })
}
