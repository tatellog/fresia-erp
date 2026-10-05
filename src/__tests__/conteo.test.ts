import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../data/db'
import type { Ingredient, Product, Sale } from '../data/types'
import { applyCount, snoozeIngredient, snoozedIngredients } from '../services/inventory'
import { countPriority, dailyUsage, daysLeft, fmtDays, ingredientKind, shoppingList, stockForLevel } from '../services/stock'

const DIA = 24 * 3600_000
const NOW = Date.UTC(2026, 9, 5, 18)
const ing = (id: string, name: string, stock: number, extra: Partial<Ingredient> = {}): Ingredient =>
  ({ id, name, unit: 'g', stock, cost: 0.06, minStock: 0, ...extra })

describe('tipo de control', () => {
  it('se deduce del nombre y respeta el asignado', () => {
    expect(ingredientKind({ name: 'Servilleta', unit: 'pza' })).toBe('consumible')
    expect(ingredientKind({ name: 'Vaso PET 16 oz', unit: 'pza' })).toBe('empaque')
    expect(ingredientKind({ name: 'Sticker / sello Frésia', unit: 'pza' })).toBe('empaque')
    expect(ingredientKind({ name: 'Fresa fresca', unit: 'g' })).toBe('critico')
    expect(ingredientKind({ name: 'Vaso PET 16 oz', unit: 'pza', kind: 'consumible' })).toBe('consumible')
  })
})

describe('consumo diario y días restantes', () => {
  const products: Product[] = [
    { id: 'clasica', name: 'Clásica · Mediano 16 oz', emoji: '', price: 115, active: true, sort: 1, recipe: [{ ingredientId: 'fresa', qty: 200 }, { ingredientId: 'vaso', qty: 1 }] },
    { id: 'extra-nuez', name: 'Nuez extra', emoji: '', price: 20, active: true, sort: 2, recipe: [{ ingredientId: 'nuez', qty: 15 }] },
  ]
  const ings = [ing('fresa', 'Fresa', 3000), ing('vaso', 'Vaso PET 16 oz', 40, { unit: 'pza' }), ing('nuez', 'Nuez', 500), ing('turin', 'Chocolate Turín', 900, { portion: 30 })]
  // 10 días con 3 vasos diarios; uno lleva Turín y nuez extra
  const sales: Sale[] = Array.from({ length: 10 }, (_, d) => ({
    id: `s${d}`, ts: NOW - (d + 0.5) * DIA, total: 345, cost: 0, payment: 'efectivo' as const,
    items: [{ productId: 'clasica', name: 'Clásica', qty: 3, price: 115, cost: 0, toppings: ['Chocolate Turín'], extras: ['Nuez extra'] }],
  }))

  it('suma recetas, toppings y extras por día de venta', () => {
    const u = dailyUsage(sales, products, ings, NOW)
    expect(u.get('fresa')).toBeCloseTo(600, 0)
    expect(u.get('vaso')).toBeCloseTo(3, 1)
    expect(u.get('turin')).toBeCloseTo(90, 0)
    expect(u.get('nuez')).toBeCloseTo(45, 0)
    expect(daysLeft(ings[0], u)).toBeCloseTo(5, 0)
  })

  it('con menos de 3 días de ventas no estima', () => {
    expect(dailyUsage(sales.slice(0, 2), products, ings, NOW).size).toBe(0)
  })

  it('lista de compra: urgente, pronto y cuánto comprar para una semana', () => {
    const u = new Map([['fresa', 3100], ['vaso', 20], ['nuez', 10]])
    const lista = shoppingList([
      ing('fresa', 'Fresa', 4200),
      ing('vaso', 'Vaso PET 16 oz', 90, { unit: 'pza' }),
      ing('nuez', 'Nuez', 5000),
      ing('serv', 'Servilleta', -316, { unit: 'pza', minStock: 100 }),
      ing('nuevo', 'Lotus', 0, { cost: 0, minStock: 200 }),
    ], u)
    expect(lista.map(i => [i.ing.id, i.priority])).toEqual([['fresa', 'urgente'], ['serv', 'urgente'], ['vaso', 'pronto']])
    // 3.1 kg/día × 7 − 4.2 kg = 17.5 kg
    expect(lista[0].suggested).toBe(17500)
    expect(lista.find(i => i.ing.id === 'vaso')!.suggested).toBe(50)
    expect(fmtDays(lista[0].daysLeft!)).toBe('~1.5 días')
  })
})

describe('conteo rápido', () => {
  beforeEach(async () => {
    await db.open()
    await Promise.all([db.ingredients.clear(), db.counts.clear(), db.outbox.clear(), db.meta.clear()])
    await db.ingredients.bulkAdd([
      ing('fresa', 'Fresa', 8200),
      ing('vaso', 'Vaso PET 16 oz', 137, { unit: 'pza', cost: 1.2 }),
      ing('turin', 'Chocolate Turín', -4380, { cost: 0.2 }),
      ing('serv', 'Servilleta', -316, { unit: 'pza', minStock: 100, cost: 0.05 }),
    ])
  })

  it('ajusta la existencia y registra la diferencia como merma o ajuste', async () => {
    const r = await applyCount([
      { ingredientId: 'fresa', counted: 6900 },
      { ingredientId: 'vaso', counted: 140 },
      { ingredientId: 'turin', counted: 1200 },
    ])
    expect(r.map(c => [c.ingredientId, c.diff, c.reason])).toEqual([
      ['fresa', -1300, 'merma'],
      ['vaso', 3, 'ajuste'],
      ['turin', 5580, 'ajuste'],
    ])
    expect(r[0].diffCost).toBe(-78)
    expect((await db.ingredients.get('fresa'))!.stock).toBe(6900)
    expect(await db.counts.count()).toBe(3)
    expect((await db.outbox.toArray()).filter(e => e.table === 'counts')).toHaveLength(3)
  })

  it('un consumible marcado con su nivel queda como ajuste', async () => {
    const serv = (await db.ingredients.get('serv'))!
    const [c] = await applyCount([{ ingredientId: 'serv', counted: stockForLevel(serv, 'ok'), approximate: true }])
    expect(c.reason).toBe('ajuste')
    expect((await db.ingredients.get('serv'))!.stock).toBe(300)
  })

  it('prioriza lo negativo y deja fuera lo recién contado y los consumibles', async () => {
    await applyCount([{ ingredientId: 'vaso', counted: 137 }])
    const orden = countPriority(await db.ingredients.toArray(), await db.counts.toArray()).map(i => i.id)
    expect(orden[0]).toBe('turin')
    expect(orden).not.toContain('serv')
    expect(orden.at(-1)).toBe('vaso')
  })

  it('ignorar en la lista de compra dura unos días', async () => {
    await snoozeIngredient('fresa', 3)
    expect(await snoozedIngredients()).toEqual(new Set(['fresa']))
    expect(await snoozedIngredients(Date.now() + 4 * DIA)).toEqual(new Set())
  })
})
