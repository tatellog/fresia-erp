import { describe, expect, it } from 'vitest'
import type { Payment, Sale } from '../data/types'
import { RECON_ID } from '../services/history'
import { channelProfit, dayExtremes, explainChange, monthProjection, pctChange, periodMetrics, topProducts } from '../services/insights'

const DIA = 24 * 3600_000
let n = 0
const venta = (ts: number, items: [string, number, number, number][], payment: Payment = 'efectivo', fee = 0): Sale => {
  const total = items.reduce((a, [, qty, price]) => a + qty * price, 0)
  const cost = items.reduce((a, [, qty, , c]) => a + qty * c, 0)
  return { id: `v${n++}`, ts, payment, total, cost, fee: fee || undefined, items: items.map(([name, qty, price, c]) => ({ productId: name, name, qty, price, cost: c })) }
}
const base = new Date(2026, 9, 10, 15).getTime()

describe('métricas del periodo', () => {
  const ventas = [
    venta(base, [['Clásica · Mediano 16 oz', 2, 115, 38]], 'tarjeta', 9.34),
    venta(base + 3600_000, [['Clásica · Mediano 16 oz', 1, 115, 38], ['Té Frutal', 1, 35, 6]]),
    venta(base - DIA, [['Choco Crema · Grande 20 oz', 1, 155, 52]]),
    // corte en papel: dinero sí, ticket no
    { id: 'papel', ts: base, payment: 'efectivo', total: 500, cost: 0, items: [{ productId: RECON_ID, name: 'Corte en papel', qty: 1, price: 500, cost: 0 }] } as Sale,
  ]

  it('ventas, tickets, ticket promedio, productos por ticket, costo, utilidad y margen', () => {
    const m = periodMetrics(ventas)
    expect(m.sold).toBe(1035)
    expect(m.net).toBe(1025.66)
    expect(m.tickets).toBe(3)
    expect(m.avgTicket).toBe(178.33)
    expect(m.unitsPerTicket).toBe(1.67)
    expect(m.cogs).toBe(172)
    expect(m.profit).toBe(853.66)
    expect(m.margin).toBe(82.5)
    expect(m.costsKnown).toBe(true)
  })

  it('más vendido, más rentable, mejor y peor día, canal más rentable', () => {
    const t = topProducts(ventas)
    expect(t.bestSeller?.name).toBe('Clásica · Mediano 16 oz')
    expect(t.mostProfitable).toMatchObject({ name: 'Clásica · Mediano 16 oz', profit: 231 })
    const d = dayExtremes(ventas)
    expect(d.best?.net).toBe(870.66)
    expect(d.worst?.net).toBe(155)
    expect(channelProfit(ventas)[0].payment).toBe('efectivo')
  })
})

describe('comparación contra el periodo anterior', () => {
  it('explica si la caída viene de clientes, ticket o productos por ticket', () => {
    const prev = { sold: 50000, tickets: 300, avgTicket: 166.67, unitsPerTicket: 1.5 }
    const cur = { sold: 45800, tickets: 310, avgTicket: 147.74, unitsPerTicket: 1.42 }
    const frase = explainChange(cur as never, prev as never)
    expect(frase).toBe('Vendiste 8.4% menos: más clientes (+3.3%), ticket promedio más bajo (−11.4%) y menos productos por ticket (−5.3%).')
    expect(pctChange(10, 0)).toBeNull()
  })
})

describe('meta del mes', () => {
  it('avance, ritmo, venta diaria necesaria y proyección', () => {
    // 10 de octubre a mediodía: 9.5 días transcurridos de 31
    const p = monthProjection(28500, 100000, new Date(2026, 9, 10, 12).getTime())
    expect(p.progress).toBe(28.5)
    expect(p.dailyAvg).toBe(3000)
    expect(p.projection).toBe(93000)
    expect(p.daysLeft).toBe(22)
    expect(p.dailyNeeded).toBe(3250)
  })
})
