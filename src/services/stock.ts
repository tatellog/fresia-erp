import type { Ingredient, InventoryCount, InventoryKind, Product, Sale } from '../data/types'

const DIA = 24 * 3600_000
/** ventana de ventas para medir el consumo */
export const VENTANA_DIAS = 14
/** con menos historial que esto no se estima cuántos días quedan */
const MIN_DIAS_HISTORIAL = 3
/** una compra sugerida cubre esta cantidad de días de consumo */
const DIAS_A_CUBRIR = 7

/** tipo de control del insumo: el que se le asignó, o deducido del nombre */
export function ingredientKind(ing: Pick<Ingredient, 'name' | 'unit' | 'kind'>): InventoryKind {
  if (ing.kind) return ing.kind
  const n = ing.name.toLowerCase()
  if (/servilleta|cuchar|popote|guante|palillo|bolsa/.test(n)) return 'consumible'
  if (ing.unit === 'pza' && /vaso|tapa|sticker|sello|caja|domo|charola|contenedor|etiqueta/.test(n)) return 'empaque'
  return 'critico'
}

export const KIND_LABEL: Record<InventoryKind, string> = {
  critico: 'Crítico',
  empaque: 'Empaque',
  consumible: 'Consumible',
}

/** nivel aproximado de un consumible: no importa si hay 181 o 184 servilletas */
export type Level = 'ok' | 'bajo' | 'agotado'
export function consumableLevel(ing: Ingredient): Level {
  if (ing.stock <= 0) return 'agotado'
  if (ing.stock <= ing.minStock) return 'bajo'
  return 'ok'
}
export const LEVEL_LABEL: Record<Level, string> = { ok: 'Hay suficiente', bajo: 'Queda poco', agotado: 'Se acabó' }

/** existencia que se guarda al marcar un consumible con su nivel */
export function stockForLevel(ing: Ingredient, level: Level): number {
  if (level === 'agotado') return 0
  if (level === 'bajo') return ing.stock > 0 && ing.stock <= ing.minStock ? ing.stock : Math.max(ing.minStock, 1)
  return ing.stock > ing.minStock ? ing.stock : Math.max(ing.minStock * 3, ing.minStock + 1, 1)
}

/**
 * Consumo diario promedio de cada insumo según las ventas de los últimos
 * días: receta de cada producto + porción de cada topping + recetas de
 * extras. Usa las recetas actuales (no hay otra fuente) y solo devuelve
 * insumos con al menos MIN_DIAS_HISTORIAL días de ventas.
 */
export function dailyUsage(sales: Sale[], products: Product[], ingredients: Ingredient[], now = Date.now()): Map<string, number> {
  const desde = now - VENTANA_DIAS * DIA
  const recientes = sales.filter(s => s.ts >= desde && s.ts <= now)
  const out = new Map<string, number>()
  if (recientes.length === 0) return out
  // días de calendario con ventas: la primera venta cuenta su día completo
  const dias = Math.min(VENTANA_DIAS, Math.ceil((now - Math.min(...recientes.map(s => s.ts))) / DIA))
  if (dias < MIN_DIAS_HISTORIAL) return out

  const prod = new Map(products.map(p => [p.id, p]))
  const prodPorNombre = new Map(products.map(p => [p.name, p]))
  const toppingPorNombre = new Map(ingredients.filter(i => i.portion).map(i => [i.name, i]))
  const usar = (id: string, q: number) => out.set(id, (out.get(id) ?? 0) + q)

  for (const s of recientes) {
    for (const it of s.items) {
      for (const r of prod.get(it.productId)?.recipe ?? []) usar(r.ingredientId, r.qty * it.qty)
      for (const t of it.toppings ?? []) {
        const ing = toppingPorNombre.get(t)
        if (ing) usar(ing.id, (ing.portion ?? 0) * it.qty)
      }
      for (const e of it.extras ?? []) {
        for (const r of prodPorNombre.get(e)?.recipe ?? []) usar(r.ingredientId, r.qty * it.qty)
      }
    }
  }
  for (const [id, q] of out) out.set(id, q / dias)
  return out
}

/** días que alcanza la existencia al ritmo actual; undefined si no hay consumo medido */
export function daysLeft(ing: Ingredient, usage: Map<string, number>): number | undefined {
  const u = usage.get(ing.id)
  if (!u || u <= 0) return undefined
  return Math.max(0, ing.stock) / u
}

/** "~1.5 días", "~4 días", "menos de 1 día" */
export function fmtDays(d: number): string {
  if (d < 1) return 'menos de 1 día'
  const r = d < 3 ? Math.round(d * 2) / 2 : Math.round(d)
  return `~${r.toLocaleString('es-MX')} ${r === 1 ? 'día' : 'días'}`
}

/** redondea hacia arriba a algo que se pueda comprar: medio kilo, medio litro, decenas de piezas */
function redondeaCompra(qty: number, ing: Ingredient): number {
  if (qty <= 0) return 0
  if (ing.unit === 'pza') return qty > 100 ? Math.ceil(qty / 50) * 50 : Math.ceil(qty / 10) * 10
  return Math.ceil(qty / 500) * 500
}

export interface ShoppingItem {
  ing: Ingredient
  kind: InventoryKind
  /** 'urgente' = en su mínimo o con 2 días o menos; 'pronto' = 5 días o menos */
  priority: 'urgente' | 'pronto'
  daysLeft?: number
  /** consumo diario, en la unidad del insumo */
  usage?: number
  /** cantidad sugerida, en la unidad del insumo; 0 para consumibles (solo "reponer") */
  suggested: number
}

/**
 * Lista de compra: lo que se acaba pronto, con cuánto comprar para cubrir
 * una semana. Los insumos sin consumo medido entran solo si ya están en su
 * mínimo; los que nunca se han comprado y están en cero no son señal.
 */
export function shoppingList(ingredients: Ingredient[], usage: Map<string, number>, snoozed: Set<string> = new Set()): ShoppingItem[] {
  const out: ShoppingItem[] = []
  for (const ing of ingredients) {
    if (snoozed.has(ing.id)) continue
    const kind = ingredientKind(ing)
    const sinDatos = ing.stock === 0 && ing.cost === 0
    if (kind === 'consumible') {
      if (sinDatos) continue
      const nivel = consumableLevel(ing)
      if (nivel !== 'ok') out.push({ ing, kind, priority: 'urgente', suggested: 0 })
      continue
    }
    const u = usage.get(ing.id)
    const dl = daysLeft(ing, usage)
    const bajo = ing.stock <= ing.minStock && ing.minStock > 0
    let priority: ShoppingItem['priority'] | undefined
    if (ing.stock < 0 || (bajo && !sinDatos) || (dl !== undefined && dl <= 2)) priority = 'urgente'
    else if (dl !== undefined && dl <= 5) priority = 'pronto'
    if (!priority) continue
    const objetivo = Math.max(u ? u * DIAS_A_CUBRIR : 0, ing.minStock * 2)
    out.push({ ing, kind, priority, daysLeft: dl, usage: u, suggested: redondeaCompra(objetivo - Math.max(ing.stock, 0), ing) })
  }
  const orden = (a: ShoppingItem) => (a.priority === 'urgente' ? 0 : 1)
  return out.sort((a, b) => orden(a) - orden(b) || (a.daysLeft ?? 99) - (b.daysLeft ?? 99) || a.ing.name.localeCompare(b.ing.name))
}

/**
 * Qué contar primero: lo que no cuadra (negativo), lo que está bajo, lo
 * que más dinero vale y lo que hace más tiempo no se cuenta. Los
 * consumibles van aparte, con hay / poco / nada.
 */
export function countPriority(ingredients: Ingredient[], counts: InventoryCount[], now = Date.now()): Ingredient[] {
  const ultimo = new Map<string, number>()
  for (const c of counts) ultimo.set(c.ingredientId, Math.max(ultimo.get(c.ingredientId) ?? 0, c.ts))
  const score = (i: Ingredient) => {
    const kind = ingredientKind(i)
    const dias = ultimo.has(i.id) ? (now - ultimo.get(i.id)!) / DIA : 30
    let s = Math.min(dias, 30)
    if (i.stock < 0) s += 100
    else if (i.minStock > 0 && i.stock <= i.minStock) s += 60
    if (kind === 'critico') s += 25
    s += Math.min(40, (Math.max(i.stock, 0) * i.cost) / 50)
    if (dias < 2) s -= 80
    return s
  }
  return ingredients
    .filter(i => ingredientKind(i) !== 'consumible' && !(i.stock === 0 && i.cost === 0))
    .sort((a, b) => score(b) - score(a))
}

/** días desde el último conteo de cualquier insumo; undefined si nunca se ha contado */
export function daysSinceLastCount(counts: InventoryCount[], now = Date.now()): number | undefined {
  if (counts.length === 0) return undefined
  return Math.floor((now - Math.max(...counts.map(c => c.ts))) / DIA)
}
