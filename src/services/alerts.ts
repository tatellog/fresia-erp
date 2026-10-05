import type { Ingredient, InventoryCount, Purchase, Sale, Waste } from '../data/types'
import { round2 } from '../lib/format'
import { periodMetrics, pctChange } from './insights'
import { daysLeft, fmtDays, ingredientKind } from './stock'
import { fmtQty, fmtUnitCost } from './units'

/**
 * Alertas que piden una acción, ordenadas por lo que más importa: dinero,
 * inventario, margen y diferencias de conteo. Cada regla tiene un umbral
 * para no avisar de ruido; si nada lo rebasa, no hay alertas.
 */

const DIA = 24 * 3600_000

export type AlertKind = 'dinero' | 'stock' | 'margen' | 'diferencia' | 'conteo'

export interface Alert {
  id: string
  kind: AlertKind
  text: string
  /** pantalla donde se resuelve */
  to?: string
  action?: string
}

const ORDEN: Record<AlertKind, number> = { dinero: 0, stock: 1, margen: 2, diferencia: 3, conteo: 4 }

/** sube el costo de compra de un insumo: precio por unidad de la última semana contra el de antes */
export function costIncreases(purchases: Purchase[], ingredients: Map<string, Ingredient>, now = Date.now(), umbral = 10) {
  const semana = now - 7 * DIA
  const desde = now - 60 * DIA
  const acc = new Map<string, { nuevoQ: number; nuevoC: number; viejoQ: number; viejoC: number }>()
  for (const p of purchases) {
    if (p.ts < desde || p.ts > now || !(p.qty > 0) || !(p.totalCost > 0)) continue
    const a = acc.get(p.ingredientId) ?? { nuevoQ: 0, nuevoC: 0, viejoQ: 0, viejoC: 0 }
    if (p.ts >= semana) { a.nuevoQ += p.qty; a.nuevoC += p.totalCost } else { a.viejoQ += p.qty; a.viejoC += p.totalCost }
    acc.set(p.ingredientId, a)
  }
  const out: { ing: Ingredient; before: number; after: number; pct: number }[] = []
  for (const [id, a] of acc) {
    const ing = ingredients.get(id)
    if (!ing || !a.nuevoQ || !a.viejoQ) continue
    const before = a.viejoC / a.viejoQ
    const after = a.nuevoC / a.nuevoQ
    const pct = pctChange(after, before)
    if (pct !== null && pct >= umbral) out.push({ ing, before, after, pct })
  }
  return out.sort((x, y) => y.pct - x.pct)
}

/**
 * Margen por producto: el de la última semana contra el de las 3 semanas
 * anteriores, con el costo que se guardó en cada venta. Solo productos con
 * costo conocido en ambos periodos y al menos 3 vendidos en cada uno.
 */
export function marginDrops(sales: Sale[], now = Date.now(), umbralPts = 5) {
  const semana = now - 7 * DIA
  const desde = now - 28 * DIA
  const acc = new Map<string, { a: [number, number, number]; b: [number, number, number] }>()
  for (const s of sales) {
    if (s.ts < desde || s.ts > now) continue
    for (const i of s.items) {
      if (!(i.cost > 0) || !(i.price > 0)) continue
      const e = acc.get(i.name) ?? { a: [0, 0, 0], b: [0, 0, 0] }
      const t = s.ts >= semana ? e.a : e.b
      t[0] += i.price * i.qty
      t[1] += i.cost * i.qty
      t[2] += i.qty
      acc.set(i.name, e)
    }
  }
  const out: { name: string; before: number; after: number }[] = []
  for (const [name, { a, b }] of acc) {
    if (a[2] < 3 || b[2] < 3) continue
    const after = Math.round(((a[0] - a[1]) / a[0]) * 100)
    const before = Math.round(((b[0] - b[1]) / b[0]) * 100)
    if (before - after >= umbralPts) out.push({ name, before, after })
  }
  return out.sort((x, y) => (y.before - y.after) - (x.before - x.after))
}

export interface WasteWeek {
  /** inicio de la semana (lunes) */
  start: number
  /** faltantes en conteo, en pesos */
  unidentified: number
  /** mermas anotadas a mano, en pesos al costo actual */
  recorded: number
}

/**
 * Merma de las últimas semanas en pesos: la que salió en conteos (faltó
 * sin explicación) y la que se anotó a mano. Más el top de insumos.
 */
export function wasteAnalysis(counts: InventoryCount[], wastes: Waste[], ingredients: Map<string, Ingredient>, now = Date.now(), semanas = 4) {
  const hoy = new Date(now)
  const lunes = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - ((hoy.getDay() + 6) % 7)).getTime()
  const weeks: WasteWeek[] = Array.from({ length: semanas }, (_, i) => ({ start: lunes - (semanas - 1 - i) * 7 * DIA, unidentified: 0, recorded: 0 }))
  const desde = weeks[0].start
  const semanaDe = (ts: number) => [...weeks].reverse().find(w => ts >= w.start)
  const porInsumo = new Map<string, { name: string; amount: number; qty: number; unit?: Ingredient['unit'] }>()
  const sumar = (id: string, name: string, amount: number, qty: number) => {
    const e = porInsumo.get(id) ?? { name, amount: 0, qty: 0, unit: ingredients.get(id)?.unit }
    e.amount += amount
    e.qty += qty
    porInsumo.set(id, e)
  }
  for (const c of counts) {
    if (c.reason !== 'merma' || c.ts < desde || c.ts > now) continue
    const w = semanaDe(c.ts)!
    w.unidentified += Math.abs(c.diffCost)
    sumar(c.ingredientId, c.ingredientName, Math.abs(c.diffCost), Math.abs(c.diff))
  }
  for (const m of wastes) {
    if (m.ts < desde || m.ts > now) continue
    const costo = (ingredients.get(m.ingredientId)?.cost ?? 0) * m.qty
    const w = semanaDe(m.ts)!
    w.recorded += costo
    sumar(m.ingredientId, m.ingredientName, costo, m.qty)
  }
  for (const w of weeks) { w.unidentified = round2(w.unidentified); w.recorded = round2(w.recorded) }
  const top = [...porInsumo.values()].filter(e => e.amount > 0).sort((a, b) => b.amount - a.amount).slice(0, 4)
    .map(e => ({ ...e, amount: round2(e.amount) }))
  const total = round2(weeks.reduce((a, w) => a + w.unidentified + w.recorded, 0))
  return { weeks, top, total }
}

export interface AlertInput {
  sales: Sale[]
  purchases: Purchase[]
  counts: InventoryCount[]
  ingredients: Ingredient[]
  usage: Map<string, number>
  now?: number
}

export function buildAlerts({ sales, purchases, counts, ingredients, usage, now = Date.now() }: AlertInput): Alert[] {
  const out: Alert[] = []
  const ingMap = new Map(ingredients.map(i => [i.id, i]))

  // dinero: costos de compra que suben
  for (const c of costIncreases(purchases, ingMap, now).slice(0, 2)) {
    out.push({
      id: `costo:${c.ing.id}`, kind: 'dinero', to: '/productos', action: 'Ver márgenes',
      text: `${c.ing.name} subió ${c.pct.toLocaleString('es-MX')}% de costo esta semana: de ${fmtUnitCost(c.before, c.ing.unit)} a ${fmtUnitCost(c.after, c.ing.unit)}.`,
    })
  }

  // dinero: ticket promedio de la semana contra la anterior
  const semana = periodMetrics(sales.filter(s => s.ts >= now - 7 * DIA && s.ts <= now))
  const anterior = periodMetrics(sales.filter(s => s.ts >= now - 14 * DIA && s.ts < now - 7 * DIA))
  const ticket = anterior.tickets >= 10 && semana.tickets >= 10 ? pctChange(semana.avgTicket, anterior.avgTicket) : null
  if (ticket !== null && ticket <= -8) {
    out.push({ id: 'ticket', kind: 'dinero', to: '/reportes', text: `El ticket promedio cayó ${Math.abs(ticket).toLocaleString('es-MX')}% esta semana: de $${Math.round(anterior.avgTicket)} a $${Math.round(semana.avgTicket)}.` })
  }

  // inventario: lo que se acaba en 2 días o menos
  const seAcaban = ingredients
    .filter(i => ingredientKind(i) !== 'consumible')
    .map(i => ({ i, d: daysLeft(i, usage) }))
    .filter((x): x is { i: Ingredient; d: number } => x.d !== undefined && x.d < 2 && x.i.stock > 0)
    .sort((a, b) => a.d - b.d)
  for (const { i, d } of seAcaban.slice(0, 2)) {
    out.push({ id: `stock:${i.id}`, kind: 'stock', to: '/inventario/lista', action: 'Lista de compra', text: `${i.name} tiene ${fmtDays(d).replace('~', '')} de inventario.` })
  }
  if (seAcaban.length > 2) {
    out.push({ id: 'stock:mas', kind: 'stock', to: '/inventario/lista', action: 'Lista de compra', text: `Otros ${seAcaban.length - 2} insumos se acaban en menos de 2 días.` })
  }

  // margen por producto
  for (const m of marginDrops(sales, now).slice(0, 2)) {
    out.push({ id: `margen:${m.name}`, kind: 'margen', to: '/productos', action: 'Ver menú', text: `El margen de ${m.name.replace(' · ', ' ')} bajó de ${m.before}% a ${m.after}%.` })
  }

  // diferencias del último conteo (faltantes que valen la pena)
  const recientes = counts.filter(c => c.reason === 'merma' && c.ts >= now - 14 * DIA)
  const ultimo = new Map<string, InventoryCount>()
  for (const c of recientes) if (!ultimo.has(c.ingredientId) || ultimo.get(c.ingredientId)!.ts < c.ts) ultimo.set(c.ingredientId, c)
  const grandes = [...ultimo.values()]
    .filter(c => Math.abs(c.diffCost) >= 100 || (c.expected > 0 && Math.abs(c.diff) / c.expected >= 0.15))
    .sort((a, b) => Math.abs(b.diffCost) - Math.abs(a.diffCost))
  for (const c of grandes.slice(0, 2)) {
    const ing = ingMap.get(c.ingredientId)
    const cuanto = ing ? fmtQty(Math.abs(c.diff), ing.unit) : String(Math.abs(c.diff))
    out.push({
      id: `dif:${c.id}`, kind: 'diferencia', to: '/inventario', action: 'Ver merma',
      text: `Hay una diferencia de ${cuanto} entre lo que marcaba el sistema y lo que se contó de ${c.ingredientName}${c.diffCost ? ` ($${Math.round(Math.abs(c.diffCost)).toLocaleString('es-MX')})` : ''}.`,
    })
  }

  // conteo atrasado: solo cuando ya hay compras (antes no hay nada que contar)
  if (purchases.length > 0) {
    const ultimoConteo = counts.length ? Math.max(...counts.map(c => c.ts)) : undefined
    const dias = ultimoConteo === undefined ? undefined : Math.floor((now - ultimoConteo) / DIA)
    if (dias === undefined) out.push({ id: 'conteo', kind: 'conteo', to: '/inventario/conteo', action: 'Hacer conteo', text: 'Aún no se ha hecho un conteo de inventario. Con uno a la semana el inventario se mantiene confiable.' })
    else if (dias >= 8) out.push({ id: 'conteo', kind: 'conteo', to: '/inventario/conteo', action: 'Hacer conteo', text: `No se ha hecho conteo de inventario en ${dias} días.` })
  }

  return out.sort((a, b) => ORDEN[a.kind] - ORDEN[b.kind])
}
