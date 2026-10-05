import { db } from '../data/db'
import { uid } from '../data/ids'
import type { Expense, ExpensePayment, Ingredient, Purchase } from '../data/types'
import { round2 } from '../lib/format'
import { enqueue } from './outbox'

export interface PurchaseLine {
  ingredientId: string
  /** cantidad en la unidad del insumo (g, ml o pza) */
  qty: number
  totalCost: number
}

/**
 * Compra con uno o varios insumos, en una sola transacción. Por cada
 * renglón sube la existencia y recalcula el costo promedio ponderado; las
 * recetas y márgenes se recalculan solos porque leen ese costo. Con
 * `expense` queda además un solo gasto por el total, ligado al turno si
 * llega `sessionId` (solo el efectivo baja el efectivo esperado del corte).
 */
export async function registerPurchaseBatch({ lines, supplier, ts = Date.now(), note, expense = false, sessionId, payment = 'efectivo' }: {
  lines: PurchaseLine[]
  supplier?: string
  ts?: number
  note?: string
  expense?: boolean
  sessionId?: string
  payment?: ExpensePayment
}) {
  const valid = lines.filter(l => l.qty > 0 && l.totalCost >= 0)
  if (valid.length === 0) throw new Error('La compra no tiene insumos')
  const proveedor = supplier?.trim() || undefined
  return db.transaction('rw', [db.ingredients, db.purchases, db.expenses, db.outbox], async () => {
    const batchId = uid()
    const nombres: string[] = []
    for (const l of valid) {
      const ing = await db.ingredients.get(l.ingredientId)
      if (!ing) throw new Error('Insumo no encontrado')
      // con existencia negativa (ventas sin compras registradas) el costo viejo no pesa
      const base = Math.max(ing.stock, 0)
      const newStock = ing.stock + l.qty
      const newCost = base + l.qty > 0 ? (base * ing.cost + l.totalCost) / (base + l.qty) : ing.cost
      // el costo va por gramo o mililitro: con 2 decimales $65/kg se guardaría como $70/kg
      const updated = { ...ing, stock: round2(newStock), cost: Math.round(newCost * 1e6) / 1e6 }
      await db.ingredients.put(updated)
      await enqueue('ingredients', 'upsert', updated)
      const purchase: Purchase = { id: uid(), ts, ingredientId: ing.id, ingredientName: ing.name, qty: l.qty, totalCost: l.totalCost, note, supplier: proveedor, batchId }
      await db.purchases.add(purchase)
      await enqueue('purchases', 'upsert', purchase)
      nombres.push(ing.name)
    }
    if (expense) {
      const total = round2(valid.reduce((a, l) => a + l.totalCost, 0))
      const que = nombres.length === 1 ? nombres[0] : `${nombres.length} insumos`
      const row: Expense = { id: uid(), ts, concept: `Compra · ${proveedor ? `${proveedor} · ${que}` : que}`, amount: total, sessionId, kind: 'gasto', payment }
      await db.expenses.add(row)
      await enqueue('expenses', 'upsert', row)
    }
    return batchId
  })
}

/** compra de un solo insumo; con `cashSessionId` queda como gasto del turno */
export async function registerPurchase(ingredientId: string, qty: number, totalCost: number, note?: string, cashSessionId?: string, payment: ExpensePayment = 'efectivo') {
  return registerPurchaseBatch({ lines: [{ ingredientId, qty, totalCost }], note, expense: !!cashSessionId, sessionId: cashSessionId, payment })
}

/** compras pasadas agrupadas (una por batch; las viejas sin batch, una por renglón), la más reciente primero */
export async function recentPurchases(limit = 30) {
  const rows = await db.purchases.orderBy('ts').reverse().limit(400).toArray()
  const groups = new Map<string, { id: string; ts: number; supplier?: string; lines: Purchase[] }>()
  for (const p of rows) {
    const k = p.batchId ?? p.id
    const g = groups.get(k) ?? { id: k, ts: p.ts, supplier: p.supplier, lines: [] }
    g.lines.push(p)
    groups.set(k, g)
  }
  return [...groups.values()].slice(0, limit)
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

/**
 * Alta y edición de insumos. Al editar se relee el renglón vivo dentro de
 * la transacción: la hoja se abrió con una foto del insumo y entre tanto una
 * venta o una compra pudo mover la existencia, que nunca debe pisarse.
 */
export async function saveIngredient(data: Omit<Ingredient, 'id' | 'stock'>, existing?: Ingredient) {
  return db.transaction('rw', [db.ingredients, db.outbox], async () => {
    const current = existing ? (await db.ingredients.get(existing.id)) ?? existing : undefined
    const row: Ingredient = current ? { ...current, ...data } : { ...data, id: uid(), stock: 0 }
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
