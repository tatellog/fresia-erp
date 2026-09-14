import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { renderTicket } from '../services/ticket'
import type { CartLine } from '../services/sales'
import type { Product } from '../data/types'

const prod = (name: string, price: number): Product =>
  ({ id: name, name, emoji: '', price, recipe: [], active: true, sort: 0 })

const lines: CartLine[] = [
  { product: prod('Frésia Clásica Grande', 135), qty: 2,
    toppings: [{ name: 'Nuez de Castilla' }, { name: 'Granada' }] as CartLine['toppings'], extras: [] },
  { product: prod('Té Frutal', 35), qty: 1, toppings: [], extras: [prod('Crema extra', 15)] },
]

describe('ticket de texto para la Point', () => {
  const t = renderTicket({ lines, total: 320, payment: 'efectivo', paid: 400, change: 80,
    attendant: 'Ana', ts: Date.UTC(2026, 8, 14, 21, 30) })

  it('cabe en el rango que exige Mercado Pago', () => {
    expect(t.length).toBeGreaterThanOrEqual(100)
    expect(t.length).toBeLessThanOrEqual(4096)
  })

  it('no manda a la impresora nada que no sea ASCII', () => {
    expect(t).toMatch(/^[\x20-\x7E]+$/)
    expect(t).toContain('Fresia Clasica Grande')
  })

  it('ningún renglón se pasa del ancho del papel', () => {
    const anchos = t.split('{br}')
      .map(l => l.replace(/\{\/?[a-z]+\}/g, '').length)
    expect(Math.max(...anchos)).toBeLessThanOrEqual(32)
  })

  it('cuadra el total a la derecha y trae el cambio', () => {
    expect(t).toContain('{w}TOTAL')
    expect(t).toMatch(/\$320\{\/w\}/)
    expect(t).toContain('Recibido $400 - Cambio $80')
  })

  it('muestra el desglose de cada línea', () => {
    expect(t).toContain('2 x Fresia Clasica Grande')
    expect(t).toContain('Nuez de Castilla, Granada')
    expect(t).toContain('+ Crema extra')
  })
})
