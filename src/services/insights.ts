import type { Payment, Sale } from '../data/types'
import { round2 } from '../lib/format'
import { saleReceived } from './fees'
import { RECON_ID } from './history'

/**
 * Métricas para decidir: cuánto entró, de dónde vino (clientes, ticket,
 * productos por ticket), cuánto costó y qué dejó, comparadas contra el
 * periodo anterior del mismo largo. Funciones puras sobre ventas.
 */

const DIA = 24 * 3600_000
/** los cortes reconstruidos en papel son dinero, pero no son tickets ni productos */
const esPapel = (s: Sale) => s.items[0]?.productId === RECON_ID

export interface PeriodMetrics {
  /** lo que de verdad entró: vendido − comisión de tarjeta */
  net: number
  /** lo que pagaron los clientes */
  sold: number
  tickets: number
  avgTicket: number
  unitsPerTicket: number
  /** costo de insumos de lo vendido */
  cogs: number
  fees: number
  /** utilidad bruta: vendido − insumos − comisión */
  profit: number
  /** utilidad bruta / vendido, en % */
  margin: number
  /** hay costos de insumos registrados para calcular utilidad */
  costsKnown: boolean
}

export function periodMetrics(sales: Sale[]): PeriodMetrics {
  const pos = sales.filter(s => !esPapel(s))
  const sold = round2(sales.reduce((a, s) => a + s.total, 0))
  const net = round2(sales.reduce((a, s) => a + saleReceived(s), 0))
  const fees = round2(sales.reduce((a, s) => a + (s.fee ?? 0), 0))
  const cogs = round2(sales.reduce((a, s) => a + s.cost, 0))
  const posSold = pos.reduce((a, s) => a + s.total, 0)
  const units = pos.reduce((a, s) => a + s.items.reduce((b, i) => b + i.qty, 0), 0)
  const profit = round2(sold - cogs - fees)
  return {
    net, sold, fees, cogs, profit,
    tickets: pos.length,
    avgTicket: pos.length ? round2(posSold / pos.length) : 0,
    unitsPerTicket: pos.length ? Math.round((units / pos.length) * 100) / 100 : 0,
    margin: sold > 0 ? Math.round((profit / sold) * 1000) / 10 : 0,
    costsKnown: pos.some(s => s.cost > 0),
  }
}

/** variación en % con un decimal; null sin base de comparación */
export function pctChange(current: number, previous: number): number | null {
  if (!(previous > 0)) return null
  return Math.round(((current - previous) / previous) * 1000) / 10
}

/** ventana del periodo anterior del mismo largo, recortada a la misma hora (hoy hasta las 5 pm contra ayer hasta las 5 pm) */
export function previousWindow(from: number, now: number, days: number): [number, number] {
  return [from - days * DIA, now - days * DIA]
}

/**
 * De dónde viene el cambio en ventas, en una frase: más o menos clientes,
 * ticket más alto o más bajo, más o menos productos por ticket. Solo se
 * nombran los movimientos de 3 % o más.
 */
export function explainChange(cur: PeriodMetrics, prev: PeriodMetrics): string | null {
  const ventas = pctChange(cur.sold, prev.sold)
  if (ventas === null || cur.tickets === 0) return null
  const partes: string[] = []
  const t = pctChange(cur.tickets, prev.tickets)
  const a = pctChange(cur.avgTicket, prev.avgTicket)
  const u = pctChange(cur.unitsPerTicket, prev.unitsPerTicket)
  if (t !== null && Math.abs(t) >= 3) partes.push(`${t > 0 ? 'más' : 'menos'} clientes (${fmtPct(t)})`)
  if (a !== null && Math.abs(a) >= 3) partes.push(`ticket promedio ${a > 0 ? 'más alto' : 'más bajo'} (${fmtPct(a)})`)
  if (u !== null && Math.abs(u) >= 3) partes.push(`${u > 0 ? 'más' : 'menos'} productos por ticket (${fmtPct(u)})`)
  if (Math.abs(ventas) < 3) return partes.length ? `Ventas parejas: ${unir(partes)}.` : 'Ventas parejas contra el periodo anterior.'
  const base = `Vendiste ${Math.abs(ventas).toLocaleString('es-MX')}% ${ventas > 0 ? 'más' : 'menos'}`
  return partes.length ? `${base}: ${unir(partes)}.` : `${base}, con clientes y ticket parecidos.`
}

const fmtPct = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toLocaleString('es-MX')}%`
const unir = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} y ${xs.at(-1)}`)

export interface ProductStat {
  name: string
  units: number
  revenue: number
  /** utilidad bruta (precio − costo de insumos) de los renglones con costo conocido */
  profit: number
}

/** desempeño por producto vendido (nombre con tamaño) */
export function productStats(sales: Sale[]): ProductStat[] {
  const acc = new Map<string, ProductStat>()
  for (const s of sales) {
    if (esPapel(s)) continue
    for (const i of s.items) {
      const p = acc.get(i.name) ?? { name: i.name, units: 0, revenue: 0, profit: 0 }
      p.units += i.qty
      p.revenue = round2(p.revenue + i.price * i.qty)
      if (i.cost > 0) p.profit = round2(p.profit + (i.price - i.cost) * i.qty)
      acc.set(i.name, p)
    }
  }
  return [...acc.values()]
}

/** el más vendido por piezas y el que más utilidad dejó en total */
export function topProducts(sales: Sale[]): { bestSeller?: ProductStat; mostProfitable?: ProductStat } {
  const stats = productStats(sales)
  const bestSeller = [...stats].sort((a, b) => b.units - a.units || b.revenue - a.revenue)[0]
  const mostProfitable = [...stats].filter(p => p.profit > 0).sort((a, b) => b.profit - a.profit)[0]
  return { bestSeller, mostProfitable }
}

/** mejor y peor día del periodo por lo que entró; solo días con ventas y si hay al menos dos */
export function dayExtremes(sales: Sale[]): { best?: { ts: number; net: number }; worst?: { ts: number; net: number } } {
  const acc = new Map<number, number>()
  for (const s of sales) {
    const d = new Date(s.ts)
    const k = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    acc.set(k, round2((acc.get(k) ?? 0) + saleReceived(s)))
  }
  if (acc.size < 2) return {}
  const dias = [...acc.entries()].map(([ts, net]) => ({ ts, net })).sort((a, b) => b.net - a.net)
  return { best: dias[0], worst: dias.at(-1) }
}

/** canal que más utilidad dejó: lo que entró menos insumos, ya sin comisión de tarjeta */
export function channelProfit(sales: Sale[]): { payment: Payment; profit: number; net: number }[] {
  const acc = new Map<Payment, { net: number; cost: number }>()
  for (const s of sales) {
    const c = acc.get(s.payment) ?? { net: 0, cost: 0 }
    c.net += saleReceived(s)
    c.cost += s.cost
    acc.set(s.payment, c)
  }
  return [...acc.entries()]
    .map(([payment, c]) => ({ payment, net: round2(c.net), profit: round2(c.net - c.cost) }))
    .sort((a, b) => b.profit - a.profit)
}

export interface MonthProjection {
  goal: number
  actual: number
  /** avance contra la meta, en % */
  progress: number
  /** promedio por día transcurrido */
  dailyAvg: number
  /** lo que hay que vender cada día que falta (contando hoy) para llegar; 0 si ya se llegó */
  dailyNeeded: number
  /** a este ritmo, cuánto se cierra el mes */
  projection: number
  daysInMonth: number
  daysLeft: number
}

/**
 * Meta del mes: avance, ritmo y proyección. El ritmo se mide por tiempo
 * transcurrido del mes (el día de hoy cuenta en proporción), para no
 * castigar la proyección por la mañana ni inflarla por la noche.
 */
export function monthProjection(actual: number, goal: number, now = Date.now()): MonthProjection {
  const d = new Date(now)
  const inicio = new Date(d.getFullYear(), d.getMonth(), 1).getTime()
  const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  const transcurridos = Math.max(1, (now - inicio) / DIA)
  const dailyAvg = round2(actual / transcurridos)
  const daysLeft = daysInMonth - d.getDate() + 1
  return {
    goal, actual, daysInMonth, daysLeft, dailyAvg,
    progress: goal > 0 ? Math.round((actual / goal) * 1000) / 10 : 0,
    dailyNeeded: round2(Math.max(0, goal - actual) / daysLeft),
    projection: round2(dailyAvg * daysInMonth),
  }
}
