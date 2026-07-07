import type { Ingredient, Sale } from '../data/types'
import { round2 } from '../lib/format'

/**
 * Analítica del negocio: funciones puras sobre ventas e inventario.
 * Reciben arreglos (no consultan la base) para poder reutilizarse en el
 * futuro con datos de varias sucursales o en el backend.
 */

/** los vasos de línea llevan '·' en el nombre (Clásica · Mini 250 ml); extras no */
const esVaso = (name: string) => name.includes('·')

export interface SalesSummary {
  total: number
  cups: number
  tickets: number
  avgTicket: number
}

export function salesSummary(sales: Sale[]): SalesSummary {
  const total = round2(sales.reduce((s, x) => s + x.total, 0))
  const cups = sales.reduce((s, x) => s + x.items.filter(i => esVaso(i.name)).reduce((a, i) => a + i.qty, 0), 0)
  return { total, cups, tickets: sales.length, avgTicket: sales.length ? round2(total / sales.length) : 0 }
}

export function profit(sales: Sale[]): { income: number; cost: number; profit: number } {
  const income = round2(sales.reduce((s, x) => s + x.total, 0))
  const cost = round2(sales.reduce((s, x) => s + x.cost, 0))
  return { income, cost, profit: round2(income - cost) }
}

export interface LineShare {
  line: 'Clásica' | 'Chocolate' | 'Balance'
  total: number
  pct: number
}

export function salesByLine(sales: Sale[]): LineShare[] {
  const acc = new Map<LineShare['line'], number>([['Clásica', 0], ['Chocolate', 0], ['Balance', 0]])
  for (const s of sales)
    for (const i of s.items) {
      if (i.name.startsWith('Clásica')) acc.set('Clásica', acc.get('Clásica')! + i.price * i.qty)
      else if (i.name.startsWith('Chocolate ·')) acc.set('Chocolate', acc.get('Chocolate')! + i.price * i.qty)
      else if (i.name.startsWith('Balance')) acc.set('Balance', acc.get('Balance')! + i.price * i.qty)
    }
  const sum = [...acc.values()].reduce((a, b) => a + b, 0)
  return [...acc.entries()].map(([line, total]) => ({
    line,
    total: round2(total),
    pct: sum > 0 ? Math.round((total / sum) * 100) : 0,
  }))
}

const SIZES = ['Mini', 'Chica', 'Mediana', 'Grande'] as const

export function cupsBySize(sales: Sale[]): { size: string; count: number }[] {
  const acc = new Map<string, number>(SIZES.map(s => [s, 0]))
  for (const s of sales)
    for (const i of s.items) {
      if (!esVaso(i.name)) continue
      const size = SIZES.find(z => i.name.includes(z))
      if (size) acc.set(size, acc.get(size)! + i.qty)
    }
  return [...acc.entries()].map(([size, count]) => ({ size, count }))
}

export function topToppings(sales: Sale[], n = 5): { name: string; count: number }[] {
  const acc = new Map<string, number>()
  for (const s of sales)
    for (const i of s.items)
      for (const t of i.toppings ?? []) acc.set(t, (acc.get(t) ?? 0) + i.qty)
  return [...acc.entries()].map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n)
}

export function topProduct(sales: Sale[]): { name: string; count: number } | null {
  const acc = new Map<string, number>()
  for (const s of sales)
    for (const i of s.items)
      if (esVaso(i.name)) acc.set(i.name, (acc.get(i.name) ?? 0) + i.qty)
  const top = [...acc.entries()].sort((a, b) => b[1] - a[1])[0]
  if (!top) return null
  // "Clásica · Mediana 500 ml" → línea + tamaño legibles
  return { name: top[0], count: top[1] }
}

/** ventas por hora del día (0-23); útil para saber cuándo se necesita más personal */
export function hourlySales(sales: Sale[]): { hour: number; total: number; tickets: number }[] {
  const acc = Array.from({ length: 24 }, (_, hour) => ({ hour, total: 0, tickets: 0 }))
  for (const s of sales) {
    const h = new Date(s.ts).getHours()
    acc[h].total = round2(acc[h].total + s.total)
    acc[h].tickets++
  }
  return acc
}

/** variación porcentual entre dos totales; null si no hay base de comparación */
export function delta(current: number, previous: number): number | null {
  if (previous <= 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

export type StockLevel = 'critico' | 'bajo' | 'ok'

export interface StockStatus {
  ingredient: Ingredient
  /** proporción contra el mínimo: <1 crítico, <2 bajo */
  ratio: number
  level: StockLevel
  /** porcentaje visual contra un inventario "sano" (3× el mínimo) */
  pct: number
}

export function stockStatus(ingredients: Ingredient[]): StockStatus[] {
  return ingredients
    .filter(i => i.minStock > 0)
    .map(i => {
      const ratio = i.stock / i.minStock
      const level: StockLevel = ratio <= 1 ? 'critico' : ratio <= 2 ? 'bajo' : 'ok'
      return { ingredient: i, ratio, level, pct: Math.max(0, Math.min(100, Math.round((i.stock / (i.minStock * 3)) * 100))) }
    })
    .sort((a, b) => a.ratio - b.ratio)
}
