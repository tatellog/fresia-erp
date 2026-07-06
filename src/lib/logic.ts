import {
  db, uid, DOMAIN_TABLES,
  type CashSession, type Expense, type Ingredient, type Payment, type Product, type SaleItem, type SyncTable,
} from '../db'
import { round2 } from './format'

/** encola un cambio para subirlo a la nube (se llama dentro de la misma transacción) */
const enqueue = (table: SyncTable, op: 'upsert' | 'delete', row: object) =>
  db.outbox.add({ table, op, row: row as Record<string, unknown>, ts: Date.now() } as never)

/** costo de insumos de una unidad del producto, con costos actuales */
export function productCost(product: Product, ingredients: Map<string, Ingredient>): number {
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

// ── Catálogo ─────────────────────────────────────────────────────────

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

export async function saveProduct(data: Omit<Product, 'id' | 'sort'>, existing?: Product, nextSort = 1) {
  return db.transaction('rw', [db.products, db.outbox], async () => {
    const row: Product = existing ? { ...existing, ...data } : { ...data, id: uid(), sort: nextSort }
    await db.products.put(row)
    await enqueue('products', 'upsert', row)
  })
}

export async function deleteProduct(id: string) {
  return db.transaction('rw', [db.products, db.outbox], async () => {
    await db.products.delete(id)
    await enqueue('products', 'delete', { id })
  })
}

// ── Caja ─────────────────────────────────────────────────────────────

export async function openCash(openAmount: number) {
  return db.transaction('rw', [db.cashSessions, db.outbox], async () => {
    const row: CashSession = { id: uid(), openTs: Date.now(), openAmount }
    await db.cashSessions.add(row)
    await enqueue('cashSessions', 'upsert', row)
  })
}

export async function closeCash(session: CashSession, closeAmount: number, expected: number) {
  return db.transaction('rw', [db.cashSessions, db.outbox], async () => {
    const row = { ...session, closeTs: Date.now(), closeAmount, expected }
    await db.cashSessions.put(row)
    await enqueue('cashSessions', 'upsert', row)
  })
}

export async function addExpense(concept: string, amount: number, sessionId?: string) {
  return db.transaction('rw', [db.expenses, db.outbox], async () => {
    const row: Expense = { id: uid(), ts: Date.now(), concept, amount, sessionId }
    await db.expenses.add(row)
    await enqueue('expenses', 'upsert', row)
  })
}

// ── Sincronización y respaldos ───────────────────────────────────────

/** encola TODO el contenido local (primer login o resincronización manual) */
export async function fullResync() {
  await db.transaction('rw', db.tables, async () => {
    await db.outbox.clear()
    for (const table of DOMAIN_TABLES) {
      const rows = await db.table(table).toArray()
      for (const row of rows) await enqueue(table, 'upsert', row)
    }
  })
}

/** respaldo completo de la base como JSON */
export async function exportBackup(): Promise<string> {
  const [ingredients, products, sales, purchases, wastes, expenses, cashSessions] = await Promise.all([
    db.ingredients.toArray(), db.products.toArray(), db.sales.toArray(),
    db.purchases.toArray(), db.wastes.toArray(), db.expenses.toArray(), db.cashSessions.toArray(),
  ])
  return JSON.stringify({ v: 2, exportedAt: Date.now(), ingredients, products, sales, purchases, wastes, expenses, cashSessions })
}

export async function importBackup(json: string) {
  const data = JSON.parse(json)
  if (data.v !== 2) throw new Error('Formato de respaldo no reconocido')
  await db.transaction('rw', db.tables, async () => {
    for (const table of DOMAIN_TABLES) {
      await db.table(table).clear()
      await db.table(table).bulkAdd(data[table] ?? [])
    }
    await db.outbox.clear()
  })
}
