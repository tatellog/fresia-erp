import { db } from '../data/db'
import type { ExpenseKind, ExpensePayment, Purchase } from '../data/types'

/**
 * Valores sugeridos para no capturar lo mismo dos veces: conceptos de
 * siempre, lo que se pagó la última vez, el fondo con que se cerró.
 * Todo sale de lo ya registrado; nada se guarda aparte salvo la última
 * forma de pago de compras.
 */

const BASE: Record<ExpenseKind, string[]> = {
  gasto: ['Hielo', 'Gasolina', 'Limpieza', 'Bolsas', 'Publicidad', 'Mantenimiento', 'Renta', 'Servicios'],
  retiro: ['Depósito al banco', 'Caja fuerte', 'Pago a proveedor'],
}

/** conceptos más usados primero (de los últimos 90 días), luego los de siempre; sin compras de insumos */
export async function frequentConcepts(kind: ExpenseKind, limit = 8): Promise<string[]> {
  const desde = Date.now() - 90 * 24 * 3600_000
  const rows = await db.expenses.where('ts').aboveOrEqual(desde).toArray()
  const cuenta = new Map<string, { label: string; n: number }>()
  for (const e of rows) {
    if ((e.kind ?? 'gasto') !== kind || e.concept.startsWith('Compra ·')) continue
    const label = e.concept.trim()
    const k = label.toLowerCase()
    const c = cuenta.get(k) ?? { label, n: 0 }
    c.n++
    cuenta.set(k, c)
  }
  const usados = [...cuenta.values()].filter(c => c.n >= 2).sort((a, b) => b.n - a.n).map(c => c.label)
  const vistos = new Set(usados.map(u => u.toLowerCase()))
  return [...usados, ...BASE[kind].filter(b => !vistos.has(b.toLowerCase()))].slice(0, limit)
}

/** la última compra de cada insumo y cuántas veces se ha comprado (para ordenar por lo más comprado) */
export async function purchaseHistory(): Promise<{ last: Map<string, Purchase>; times: Map<string, number>; lastSupplier?: string }> {
  const rows = await db.purchases.orderBy('ts').toArray()
  const last = new Map<string, Purchase>()
  const times = new Map<string, number>()
  for (const p of rows) {
    last.set(p.ingredientId, p)
    times.set(p.ingredientId, (times.get(p.ingredientId) ?? 0) + 1)
  }
  const lastSupplier = [...rows].reverse().find(p => p.supplier)?.supplier
  return { last, times, lastSupplier }
}

const PAGO_KEY = 'lastPurchasePayment'
export async function lastPurchasePayment(): Promise<ExpensePayment | 'fuera' | undefined> {
  return (await db.meta.get(PAGO_KEY))?.value as ExpensePayment | 'fuera' | undefined
}
export async function rememberPurchasePayment(p: ExpensePayment | 'fuera') {
  await db.meta.put({ key: PAGO_KEY, value: p })
}

/** efectivo que quedó en el último corte: casi siempre es el fondo con que se abre */
export async function lastClosingCash(): Promise<number | undefined> {
  const s = await db.cashSessions.orderBy('openTs').reverse().filter(x => x.closeTs !== undefined).first()
  return s?.closeAmount
}

/** mínimo sugerido: dos días de consumo, redondeado a algo que se cuente fácil */
export function suggestedMinStock(dailyUsage: number | undefined, unit: 'g' | 'ml' | 'pza'): number | undefined {
  if (!dailyUsage || dailyUsage <= 0) return undefined
  const q = dailyUsage * 2
  if (unit === 'pza') return Math.max(1, Math.ceil(q / 5) * 5)
  return Math.ceil(q / 100) * 100
}
