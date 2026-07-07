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
  venta(hoy, [item('Clásica · Mediana 500 ml', 2, 109, ['Cajeta', 'Oreo triturada'])]),
  venta(hoy + 3600e3, [item('Balance · Chica 350 ml', 1, 105, ['Chía', 'Pistache']), item('Fresa extra', 1, 20)]),
  venta(hoy + 3600e3, [item('Chocolate · Grande 700 ml', 1, 149, ['Cajeta'])]),
]

describe('analítica del dashboard', () => {
  it('resumen: total, vasos (extras no cuentan) y ticket promedio', () => {
    const s = salesSummary(ventas)
    expect(s.total).toBe(218 + 125 + 149)
    expect(s.cups).toBe(4)          // 2 medianas + 1 chica + 1 grande; la fresa extra no es vaso
    expect(s.tickets).toBe(3)
    expect(s.avgTicket).toBe(164)
  })

  it('participación por línea suma 100%', () => {
    const lines = salesByLine(ventas)
    expect(lines.reduce((s, l) => s + l.pct, 0)).toBeGreaterThanOrEqual(99)
    expect(lines.find(l => l.line === 'Clásica')!.total).toBe(218)
  })

  it('vasos por tamaño', () => {
    const m = Object.fromEntries(cupsBySize(ventas).map(x => [x.size, x.count]))
    expect(m).toEqual({ Mini: 0, Chica: 1, Mediana: 2, Grande: 1 })
  })

  it('toppings más usados ponderados por cantidad', () => {
    const t = topToppings(ventas)
    expect(t[0]).toEqual({ name: 'Cajeta', count: 3 })  // 2 medianas + 1 grande
  })

  it('histograma por hora y variación porcentual', () => {
    const h = hourlySales(ventas)
    expect(h[13].tickets).toBe(1)
    expect(h[14].tickets).toBe(2)
    expect(delta(118, 100)).toBe(18)
    expect(delta(100, 0)).toBeNull()
  })
})
