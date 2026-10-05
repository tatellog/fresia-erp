import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../data/db'
import type { Ingredient, Product } from '../data/types'
import { recentPurchases, registerPurchaseBatch } from '../services/inventory'
import { costBreakdown } from '../services/costing'
import { fmtQty, fmtUnitCost } from '../services/units'

const ing = (id: string, name: string, stock: number, cost: number, unit: Ingredient['unit'] = 'g'): Ingredient =>
  ({ id, name, unit, stock, cost, minStock: 0 })

beforeEach(async () => {
  await db.open()
  await Promise.all([db.ingredients.clear(), db.purchases.clear(), db.expenses.clear(), db.outbox.clear()])
  await db.ingredients.bulkAdd([
    ing('fresa', 'Fresa', 5000, 0.06),
    ing('crema', 'Crema', 0, 0, 'ml'),
    ing('turin', 'Chocolate Turín', -4380, 0.2),
  ])
})

describe('compra con varios insumos', () => {
  it('sube cada existencia, promedia el costo y deja un solo gasto por el total', async () => {
    await registerPurchaseBatch({
      supplier: ' Costco ',
      lines: [{ ingredientId: 'fresa', qty: 7000, totalCost: 490 }, { ingredientId: 'crema', qty: 3000, totalCost: 297 }],
      expense: true,
      sessionId: 's1',
      payment: 'tarjeta',
    })
    const fresa = (await db.ingredients.get('fresa'))!
    // 5 kg a $60/kg + 7 kg a $70/kg = $790 / 12 kg
    expect(fresa.stock).toBe(12000)
    expect(fresa.cost).toBeCloseTo(790 / 12000, 6)
    expect((await db.ingredients.get('crema'))!).toMatchObject({ stock: 3000, cost: 0.099 })

    const compras = await db.purchases.toArray()
    expect(compras).toHaveLength(2)
    expect(new Set(compras.map(c => c.batchId)).size).toBe(1)
    expect(compras.every(c => c.supplier === 'Costco')).toBe(true)

    const gastos = await db.expenses.toArray()
    expect(gastos).toHaveLength(1)
    expect(gastos[0]).toMatchObject({ amount: 787, concept: 'Compra · Costco · 2 insumos', sessionId: 's1', payment: 'tarjeta', kind: 'gasto' })
  })

  it('con existencia negativa toma el precio de la compra como costo', async () => {
    await registerPurchaseBatch({ lines: [{ ingredientId: 'turin', qty: 5000, totalCost: 1250 }] })
    expect((await db.ingredients.get('turin'))!).toMatchObject({ stock: 620, cost: 0.25 })
  })

  it('sin gasto (pagada fuera de caja) solo mueve el inventario', async () => {
    await registerPurchaseBatch({ lines: [{ ingredientId: 'crema', qty: 1000, totalCost: 99 }], expense: false })
    expect(await db.expenses.count()).toBe(0)
    expect((await db.ingredients.get('crema'))!.stock).toBe(1000)
  })

  it('agrupa las compras recientes para repetirlas', async () => {
    await registerPurchaseBatch({ supplier: 'Costco', ts: 1000, lines: [{ ingredientId: 'fresa', qty: 1000, totalCost: 70 }, { ingredientId: 'crema', qty: 1000, totalCost: 99 }] })
    await registerPurchaseBatch({ supplier: 'Mercado', ts: 2000, lines: [{ ingredientId: 'fresa', qty: 2000, totalCost: 120 }] })
    const grupos = await recentPurchases()
    expect(grupos.map(g => [g.supplier, g.lines.length])).toEqual([['Mercado', 1], ['Costco', 2]])
  })

  it('rechaza una compra vacía', async () => {
    await expect(registerPurchaseBatch({ lines: [{ ingredientId: 'fresa', qty: 0, totalCost: 10 }] })).rejects.toThrow()
  })
})

describe('qué le falta al costo de un producto', () => {
  const map = new Map([ing('fresa', 'Fresa', 0, 0.06), ing('turin', 'Chocolate Turín', 0, 0)].map(i => [i.id, i]))
  const prod = (recipe: Product['recipe']): Product => ({ id: 'p', name: 'Clásica', emoji: '', price: 115, recipe, active: true, sort: 1 })

  it('sin receta lo dice', () => {
    expect(costBreakdown(prod([]), map)).toMatchObject({ noRecipe: true, missing: [], cost: 0 })
  })
  it('nombra los insumos sin precio de compra', () => {
    expect(costBreakdown(prod([{ ingredientId: 'fresa', qty: 200 }, { ingredientId: 'turin', qty: 30 }]), map))
      .toMatchObject({ noRecipe: false, missing: ['Chocolate Turín'], cost: 12 })
  })
})

describe('unidades legibles', () => {
  it('muestra kg, L y piezas', () => {
    expect(fmtQty(6200, 'g')).toBe('6.2 kg')
    expect(fmtQty(750, 'ml')).toBe('750 ml')
    expect(fmtQty(-316, 'pza')).toBe('-316 pzas')
    expect(fmtUnitCost(0.065, 'g')).toBe('$65/kg')
  })
})
