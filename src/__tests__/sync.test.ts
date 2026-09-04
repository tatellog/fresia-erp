import { describe, expect, it } from 'vitest'
import { toCloud } from '../services/sync/mapping'
import { fromCloud } from '../services/sync/restore'
import type { CashSession, Ingredient, Investment, Product, Sale } from '../data/types'

/** el viaje redondo local → nube → local debe conservar los datos del negocio */
const roundTrip = (table: keyof typeof toCloud, row: Record<string, unknown>) =>
  fromCloud[table](toCloud[table].map(row, 'Principal'))

describe('sync: mapeo ida y vuelta', () => {
  it('conserva una venta completa', () => {
    const sale: Sale = {
      id: 's1', ts: 1700000000000, total: 150, cost: 60, payment: 'rappi', sessionId: 'cs1', employeeName: 'Ana',
      items: [{ productId: 'p1', name: 'Clásica grande', qty: 1, price: 150, cost: 60, toppings: ['Fresa'], extras: ['Nutella'] }],
    }
    expect(roundTrip('sales', sale as never)).toMatchObject(sale)
  })

  it('conserva insumos con campos de topping', () => {
    const ing: Ingredient = { id: 'i1', name: 'Pistache', unit: 'g', stock: 500, cost: 0.9, minStock: 100, toppingGroups: ['clasica'], portion: 15, premiumPrice: 20 }
    expect(roundTrip('ingredients', ing as never)).toMatchObject(ing)
  })

  it('conserva productos con línea y receta', () => {
    const prod: Product = { id: 'p1', name: 'Balance', emoji: '', price: 120, recipe: [{ ingredientId: 'i1', qty: 30 }], active: true, sort: 3, toppingGroup: 'balance', line: 'balance', extraScope: ['balance'] }
    expect(roundTrip('products', prod as never)).toMatchObject(prod)
  })

  it('conserva listas de toppings', () => {
    const list = { id: 'frutas', name: 'Frutas', sort: 3 }
    expect(roundTrip('toppingLists', list)).toMatchObject(list)
  })

  it('conserva cortes de caja con cierre', () => {
    const cs: CashSession = { id: 'c1', openTs: 1700000000000, closeTs: 1700003600000, openAmount: 500, closeAmount: 2350, expected: 2400, employeeName: 'Ana', note: 'faltaron 50' }
    expect(roundTrip('cashSessions', cs as never)).toMatchObject(cs)
  })

  it('conserva inversiones y su pendiente', () => {
    const inv: Investment = { id: 'v1', ts: 1700000000000, concept: 'Carrito', amount: 12000, paidBy: 'TA', pending: 4000 }
    expect(roundTrip('investments', inv as never)).toMatchObject(inv)
  })

  it('el PIN de empleados no viaja a la nube y regresa vacío', () => {
    const back = roundTrip('employees', { id: 'e1', name: 'Ana', pin: '1234', active: true })
    expect(back).toMatchObject({ id: 'e1', name: 'Ana', active: true, pin: '' })
  })
})
