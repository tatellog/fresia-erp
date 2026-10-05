import { describe, expect, it } from 'vitest'
import type { Ingredient, InventoryCount, Purchase, Sale } from '../data/types'
import { buildAlerts, costIncreases, marginDrops, wasteAnalysis } from '../services/alerts'

const DIA = 24 * 3600_000
const NOW = new Date(2026, 9, 15, 18).getTime()
const ing = (id: string, name: string, stock: number, cost: number, unit: Ingredient['unit'] = 'g'): Ingredient =>
  ({ id, name, unit, stock, cost, minStock: 0 })
const compra = (ingredientId: string, daysAgo: number, qty: number, totalCost: number): Purchase =>
  ({ id: `${ingredientId}${daysAgo}`, ts: NOW - daysAgo * DIA, ingredientId, ingredientName: ingredientId, qty, totalCost })
const venta = (daysAgo: number, name: string, price: number, cost: number, qty = 1): Sale =>
  ({ id: `v${daysAgo}${name}${price}${Math.random()}`, ts: NOW - daysAgo * DIA, payment: 'efectivo', total: price * qty, cost: cost * qty, items: [{ productId: name, name, qty, price, cost }] })
const conteo = (ingredientId: string, daysAgo: number, expected: number, counted: number, cost: number, reason: InventoryCount['reason'] = 'merma'): InventoryCount =>
  ({ id: `c${ingredientId}${daysAgo}`, ts: NOW - daysAgo * DIA, ingredientId, ingredientName: ingredientId === 'fresa' ? 'Fresa' : ingredientId, expected, counted, diff: counted - expected, diffCost: (counted - expected) * cost, reason })

const fresa = ing('fresa', 'Fresa', 6000, 0.08)
const turin = ing('turin', 'Chocolate Turín', 300, 0.2)
const ingMap = new Map([fresa, turin].map(i => [i.id, i]))

describe('reglas de alertas', () => {
  it('costo que sube 10% o más en la semana', () => {
    const r = costIncreases([compra('fresa', 20, 7000, 525), compra('fresa', 2, 7000, 588)], ingMap, NOW)
    expect(r).toHaveLength(1)
    expect(r[0].pct).toBe(12)
    expect(costIncreases([compra('fresa', 20, 7000, 525), compra('fresa', 2, 7000, 550)], ingMap, NOW)).toHaveLength(0)
  })

  it('margen de un producto que baja 5 puntos o más', () => {
    const ventas = [
      ...[10, 12, 15, 20].map(d => venta(d, 'Clásica · Mediano 16 oz', 115, 36.8)),
      ...[1, 2, 3].map(d => venta(d, 'Clásica · Mediano 16 oz', 115, 44.85)),
    ]
    expect(marginDrops(ventas, NOW)).toEqual([{ name: 'Clásica · Mediano 16 oz', before: 68, after: 61 }])
  })

  it('arma las alertas en orden: dinero, inventario, margen, diferencia y conteo', () => {
    const ventas = [
      ...Array.from({ length: 12 }, (_, i) => venta(8 + (i % 6), 'Clásica · Mediano 16 oz', 160, 36.8)),
      ...Array.from({ length: 12 }, (_, i) => venta(1 + (i % 5), 'Clásica · Mediano 16 oz', 140, 44.85)),
    ]
    const alertas = buildAlerts({
      sales: ventas,
      purchases: [compra('fresa', 20, 7000, 525), compra('fresa', 2, 7000, 588)],
      counts: [conteo('fresa', 9, 8200, 5000, 0.08)],
      ingredients: [fresa, turin],
      usage: new Map([['turin', 200]]),
      now: NOW,
    })
    expect(alertas.map(a => a.kind)).toEqual(['dinero', 'dinero', 'stock', 'margen', 'diferencia', 'conteo'])
    expect(alertas[0].text).toBe('Fresa subió 12% de costo esta semana: de $75/kg a $84/kg.')
    expect(alertas[1].text).toMatch(/^El ticket promedio cayó 12.5% esta semana/)
    expect(alertas[2].text).toBe('Chocolate Turín tiene 1.5 días de inventario.')
    expect(alertas[3].text).toBe('El margen de Clásica Mediano 16 oz bajó de 77% a 68%.')
    expect(alertas[4].text).toBe('Hay una diferencia de 3.2 kg entre lo que marcaba el sistema y lo que se contó de Fresa ($256).')
    expect(alertas[5].text).toBe('No se ha hecho conteo de inventario en 9 días.')
  })

  it('sin nada fuera de lo normal no hay alertas', () => {
    expect(buildAlerts({ sales: [], purchases: [], counts: [], ingredients: [fresa], usage: new Map(), now: NOW })).toEqual([])
  })
})

describe('análisis de merma', () => {
  it('suma por semana lo que faltó en conteos y lo anotado, y los insumos que más pesan', () => {
    const r = wasteAnalysis(
      [conteo('fresa', 1, 8200, 6900, 0.08), conteo('fresa', 9, 5000, 4000, 0.08), conteo('turin', 1, 100, 150, 0.2, 'ajuste')],
      [{ id: 'w', ts: NOW - 2 * DIA, ingredientId: 'turin', ingredientName: 'Chocolate Turín', qty: 500, reason: 'caducó' }],
      ingMap, NOW,
    )
    expect(r.weeks.at(-1)).toMatchObject({ unidentified: 104, recorded: 100 })
    expect(r.weeks.at(-2)).toMatchObject({ unidentified: 80, recorded: 0 })
    expect(r.total).toBe(284)
    expect(r.top.map(t => t.name)).toEqual(['Fresa', 'Chocolate Turín'])
  })
})
