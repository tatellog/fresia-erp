import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../data/db'
import type { Ingredient } from '../data/types'
import { ozOf, scaleRecipe } from '../services/costing'
import { registerPurchaseBatch } from '../services/inventory'
import { frequentConcepts, lastClosingCash, purchaseHistory, suggestedMinStock } from '../services/suggestions'

const ing = (id: string, name: string, unit: Ingredient['unit']): Ingredient => ({ id, name, unit, stock: 0, cost: 0, minStock: 0 })

describe('receta de otro tamaño', () => {
  const ings = [ing('fresa', 'Fresa fresca', 'g'), ing('crema', 'Crema', 'ml'), ing('v16', 'Vaso PET 16 oz', 'pza'), ing('v20', 'Vaso PET 20 oz', 'pza'), ing('tapa', 'Tapa domo', 'pza')]
  it('escala gramos y mililitros por onzas y cambia el vaso por el del tamaño nuevo', () => {
    expect(ozOf('Clásica · Grande 20 oz')).toBe(20)
    const r = scaleRecipe(
      [{ ingredientId: 'fresa', qty: 240 }, { ingredientId: 'crema', qty: 190 }, { ingredientId: 'v16', qty: 1 }, { ingredientId: 'tapa', qty: 1 }],
      16, 20, ings,
    )
    expect(r).toEqual([
      { ingredientId: 'fresa', qty: 300 },
      { ingredientId: 'crema', qty: 240 },
      { ingredientId: 'v20', qty: 1 },
      { ingredientId: 'tapa', qty: 1 },
    ])
  })
})

describe('valores sugeridos', () => {
  beforeEach(async () => {
    await db.open()
    await Promise.all([db.expenses.clear(), db.cashSessions.clear(), db.purchases.clear(), db.ingredients.clear()])
  })

  it('conceptos de gasto: los más usados primero y luego los de siempre, sin compras', async () => {
    const now = Date.now()
    await db.expenses.bulkAdd([
      { id: '1', ts: now, concept: 'Uber de fresas', amount: 60, kind: 'gasto' },
      { id: '2', ts: now, concept: 'uber de fresas', amount: 70, kind: 'gasto' },
      { id: '3', ts: now, concept: 'Compra · Costco · 3 insumos', amount: 900, kind: 'gasto' },
      { id: '4', ts: now, concept: 'Compra · Costco · 3 insumos', amount: 900, kind: 'gasto' },
    ])
    const c = await frequentConcepts('gasto')
    expect(c[0]).toBe('Uber de fresas')
    expect(c).toContain('Hielo')
    expect(c.some(x => x.startsWith('Compra'))).toBe(false)
  })

  it('el fondo sugerido es lo que se contó en el último corte', async () => {
    await db.cashSessions.bulkAdd([
      { id: 'a', openTs: 1, closeTs: 2, openAmount: 500, closeAmount: 1200 },
      { id: 'b', openTs: 3, closeTs: 4, openAmount: 500, closeAmount: 800 },
      { id: 'c', openTs: 5, openAmount: 800 },
    ])
    expect(await lastClosingCash()).toBe(800)
  })

  it('historial de compras: última de cada insumo, veces y último proveedor', async () => {
    await db.ingredients.bulkAdd([{ ...ing('fresa', 'Fresa', 'g') }, { ...ing('crema', 'Crema', 'ml') }])
    await registerPurchaseBatch({ supplier: 'Costco', ts: 1000, lines: [{ ingredientId: 'fresa', qty: 7000, totalCost: 525 }] })
    await registerPurchaseBatch({ supplier: 'Mercado', ts: 2000, lines: [{ ingredientId: 'fresa', qty: 7000, totalCost: 600 }, { ingredientId: 'crema', qty: 900, totalCost: 77 }] })
    const h = await purchaseHistory()
    expect(h.last.get('fresa')?.totalCost).toBe(600)
    expect(h.times.get('fresa')).toBe(2)
    expect(h.lastSupplier).toBe('Mercado')
  })

  it('mínimo sugerido: dos días de consumo redondeado', () => {
    expect(suggestedMinStock(2140, 'g')).toBe(4300)
    expect(suggestedMinStock(11, 'pza')).toBe(25)
    expect(suggestedMinStock(undefined, 'g')).toBeUndefined()
  })
})
