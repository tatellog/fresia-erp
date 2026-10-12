import { db } from '../data/db'
import { uid } from '../data/ids'
import type { Expense, ExpensePayment, Ingredient, InventoryCount, Purchase } from '../data/types'
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

/** qué gasta preparar `qty` de un insumo preparado (en su unidad) y cuánto cuesta con los costos de hoy */
export function prepPlan(ing: Ingredient, qty: number, ingMap: Map<string, Ingredient>) {
  const f = ing.prep && ing.prep.yield > 0 ? qty / ing.prep.yield : 0
  const lines = (ing.prep?.items ?? []).map(it => {
    const comp = ingMap.get(it.ingredientId)
    const q = round2(it.qty * f)
    return { ingredientId: it.ingredientId, ing: comp, qty: q, cost: (comp?.cost ?? 0) * q }
  })
  const total = round2(lines.reduce((a, l) => a + l.cost, 0))
  return { lines, total, perUnit: qty > 0 ? total / qty : 0, sinCosto: lines.filter(l => l.ing && l.ing.cost === 0 && !l.ing.included).map(l => l.ing!.name) }
}

/**
 * Preparación en la tienda (un lote de crema): baja cada ingrediente según la
 * receta escalada y sube el insumo preparado, con su costo promedio
 * recalculado igual que en una compra. Se relee todo dentro de la
 * transacción porque una venta pudo mover las existencias.
 */
export async function registerPreparation(ingredientId: string, qty: number) {
  if (!(qty > 0)) throw new Error('Escribe cuánto preparaste')
  return db.transaction('rw', [db.ingredients, db.outbox], async () => {
    const ing = await db.ingredients.get(ingredientId)
    if (!ing?.prep) throw new Error('Este insumo no tiene receta de preparación')
    const comps = await db.ingredients.bulkGet(ing.prep.items.map(i => i.ingredientId))
    const plan = prepPlan(ing, qty, new Map(comps.filter(c => !!c).map(c => [c!.id, c!])))
    for (const l of plan.lines) {
      if (!l.ing || l.ingredientId === ing.id) continue
      const updated = { ...l.ing, stock: round2(l.ing.stock - l.qty) }
      await db.ingredients.put(updated)
      await enqueue('ingredients', 'upsert', updated)
    }
    const base = Math.max(ing.stock, 0)
    const cost = plan.total > 0 ? (base * ing.cost + plan.total) / (base + qty) : ing.cost
    const updated = { ...ing, stock: round2(ing.stock + qty), cost: Math.round(cost * 1e6) / 1e6 }
    await db.ingredients.put(updated)
    await enqueue('ingredients', 'upsert', updated)
    return plan
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

/**
 * Conteo físico: la existencia pasa a lo que se contó y queda registrada
 * la diferencia contra lo que esperaba el sistema. Lo que faltó se
 * clasifica como merma no identificada; lo que sobró, o un insumo que el
 * sistema traía en negativo (ventas sin compras capturadas), es ajuste.
 * Se relee cada insumo dentro de la transacción: una venta pudo moverlo
 * mientras se contaba.
 */
export async function applyCount(entries: { ingredientId: string; counted: number; approximate?: boolean }[]) {
  return db.transaction('rw', [db.ingredients, db.counts, db.outbox, db.meta, db.employees], async () => {
    const activeId = (await db.meta.get('activeEmployeeId'))?.value
    const employee = activeId ? await db.employees.get(activeId) : undefined
    const ts = Date.now()
    const out: InventoryCount[] = []
    for (const e of entries) {
      const ing = await db.ingredients.get(e.ingredientId)
      if (!ing || !(e.counted >= 0)) continue
      const diff = round2(e.counted - ing.stock)
      const reason: InventoryCount['reason'] = e.approximate || ing.stock < 0 || diff >= 0 ? 'ajuste' : 'merma'
      const row: InventoryCount = {
        id: uid(), ts, ingredientId: ing.id, ingredientName: ing.name,
        expected: ing.stock, counted: e.counted, diff, diffCost: round2(diff * ing.cost), reason,
        employeeName: employee?.name,
      }
      const updated = { ...ing, stock: round2(e.counted) }
      await db.ingredients.put(updated)
      await enqueue('ingredients', 'upsert', updated)
      await db.counts.add(row)
      await enqueue('counts', 'upsert', row)
      out.push(row)
    }
    return out
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
    return row
  })
}

export async function deleteIngredient(id: string) {
  return db.transaction('rw', [db.ingredients, db.outbox], async () => {
    await db.ingredients.delete(id)
    await enqueue('ingredients', 'delete', { id })
  })
}

const SNOOZE_KEY = 'shopSnooze'

/** insumos que la lista de compra ignora por ahora (solo en este dispositivo) */
export async function snoozedIngredients(now = Date.now()): Promise<Set<string>> {
  const raw = (await db.meta.get(SNOOZE_KEY))?.value
  const map: Record<string, number> = raw ? JSON.parse(raw) : {}
  return new Set(Object.entries(map).filter(([, hasta]) => hasta > now).map(([id]) => id))
}

/** saca un insumo de la lista de compra por unos días */
export async function snoozeIngredient(id: string, days = 3) {
  const raw = (await db.meta.get(SNOOZE_KEY))?.value
  const map: Record<string, number> = raw ? JSON.parse(raw) : {}
  const now = Date.now()
  for (const [k, v] of Object.entries(map)) if (v <= now) delete map[k]
  map[id] = now + days * 24 * 3600_000
  await db.meta.put({ key: SNOOZE_KEY, value: JSON.stringify(map) })
}
