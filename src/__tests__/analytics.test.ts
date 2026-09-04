import { describe, expect, it } from 'vitest'
import type { Sale } from '../data/types'
import { cupsBySize, delta, hourlySales, salesByLine, salesSummary, topToppings } from '../services/analytics'

const venta = (ts: number, items: Sale['items']): Sale => ({
  id: 'x', ts, items,
  total: items.reduce((s, i) => s + i.price * i.qty, 0),
  cost: 0, payment: 'efectivo',
})

const item = (name: string, qty: number, price: number, toppings?: string[]) =>
  ({ productId: 'p', name, qty, price, cost: 0, toppings })

const hoy = new Date(2026, 6, 6, 13, 0).getTime()

const ventas: Sale[] = [
  venta(hoy, [item('Clásica · Mediano 16 oz', 2, 115, ['Cajeta', 'Oreo triturada'])]),
  venta(hoy + 3600e3, [item('Balance · Chico 12 oz', 1, 105, ['Arándano', 'Pistache']), item('Frèsia Brûlée · Grande 20 oz', 1, 165)]),
  venta(hoy + 3600e3, [item('Chocolate · Grande 20 oz', 1, 155, ['Cajeta'])]),
  // venta con nombre del menú anterior: se sigue contando (Mediana → Mediano)
  venta(hoy, [item('Clásica · Mediana 500 ml', 1, 109, ['Cajeta'])]),
]

describe('analítica del dashboard', () => {
  it('resumen: total, vasos y ticket promedio', () => {
    const s = salesSummary(ventas)
    expect(s.total).toBe(230 + 270 + 155 + 109)
    expect(s.cups).toBe(6)          // 2 medianos + 1 chico + 1 brûlée + 1 grande + 1 legado
    expect(s.tickets).toBe(4)
    expect(s.avgTicket).toBe(191)
  })

  it('participación por línea suma 100% e incluye Brûlée', () => {
    const lines = salesByLine(ventas)
    expect(lines.reduce((s, l) => s + l.pct, 0)).toBeGreaterThanOrEqual(99)
    expect(lines.find(l => l.line === 'Clásica')!.total).toBe(230 + 109)
    expect(lines.find(l => l.line === 'Brûlée')!.total).toBe(165)
  })

  it('la línea de chocolate junta el nombre viejo, Choco Crema y Chocolate Turín', () => {
    const chocolates = [
      venta(hoy, [item('Chocolate · Grande 20 oz', 1, 155)]),
      venta(hoy, [item('Choco Crema · Chico 12 oz', 1, 115)]),
      venta(hoy, [item('Chocolate Turín · Chico 12 oz', 1, 135)]),
    ]
    expect(salesByLine(chocolates).find(l => l.line === 'Choco Crema')!.total).toBe(155 + 115 + 135)
  })

  it('vasos por tamaño (los del menú viejo cuentan en su equivalente)', () => {
    const m = Object.fromEntries(cupsBySize(ventas).map(x => [x.size, x.count]))
    expect(m).toEqual({ Chico: 1, Mediano: 3, Grande: 2 })
  })

  it('toppings más usados ponderados por cantidad', () => {
    const t = topToppings(ventas)
    expect(t[0]).toEqual({ name: 'Cajeta', count: 4 })  // 2 medianos + 1 grande + 1 legado
  })

  it('histograma por hora y variación porcentual', () => {
    const h = hourlySales(ventas)
    expect(h[13].tickets).toBe(2)
    expect(h[14].tickets).toBe(2)
    expect(delta(118, 100)).toBe(18)
    expect(delta(100, 0)).toBeNull()
  })
})
