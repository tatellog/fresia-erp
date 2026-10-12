import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../data/db'
import type { Ingredient, Product } from '../data/types'
import { prepPlan, registerPreparation } from '../services/inventory'
import { costBreakdown } from '../services/costing'
import { toCloud } from '../services/sync/mapping'

const ing = (id: string, stock: number, cost: number, unit: Ingredient['unit'] = 'g', extra: Partial<Ingredient> = {}): Ingredient =>
  ({ id, name: id, unit, stock, cost, minStock: 0, ...extra })

// la crema de la casa: con esto salen 3 L
const crema = ing('crema', -500, 0.085, 'ml', {
  prep: { yield: 3000, batch: 5000, items: [{ ingredientId: 'queso', qty: 190 }, { ingredientId: 'yogurt', qty: 500 }] },
})

beforeEach(async () => {
  await db.open()
  await Promise.all([db.ingredients.clear(), db.outbox.clear()])
  await db.ingredients.bulkAdd([crema, ing('queso', 1000, 40 / 190), ing('yogurt', 900, 70 / 900, 'ml')])
})

describe('preparación en la tienda', () => {
  it('escala la receta al lote y calcula el costo', () => {
    const map = new Map([crema, ing('queso', 0, 40 / 190), ing('yogurt', 0, 70 / 900, 'ml')].map(i => [i.id, i]))
    const plan = prepPlan(crema, 5000, map)
    expect(plan.lines.map(l => l.qty)).toEqual([316.67, 833.33])
    expect(plan.total).toBeCloseTo((40 + 38.89) * 5 / 3, 1)
  })

  it('baja los ingredientes, sube lo preparado y su costo ignora la existencia negativa', async () => {
    await registerPreparation('crema', 5000)
    const [c, q, y] = await db.ingredients.bulkGet(['crema', 'queso', 'yogurt'])
    expect(q!.stock).toBeCloseTo(1000 - 316.67, 2)
    expect(y!.stock).toBeCloseTo(900 - 833.33, 2)
    expect(c!.stock).toBe(4500)
    // con existencia negativa el costo viejo no pesa: queda el del lote
    expect(c!.cost).toBeCloseTo(((40 + 70 * 500 / 900) * 5 / 3) / 5000, 5)
    expect(await db.outbox.count()).toBe(3)
  })

  it('no sube prep ausente, para no borrarlo desde un dispositivo que aún no lo baja', () => {
    const fila = toCloud.ingredients.map({ ...ing('vaso', 0, 3, 'pza') }, 'Principal')
    expect('prep' in fila).toBe(false)
    expect('included' in fila).toBe(false)
  })
})

describe('insumo incluido', () => {
  it('una tapa que viene con el vaso no cuenta como precio faltante', () => {
    const product = { id: 'p', name: 'Clásica', emoji: '', price: 95, active: true, sort: 0, recipe: [{ ingredientId: 'tapa', qty: 1 }, { ingredientId: 'cuchara', qty: 1 }] } as Product
    const map = new Map([ing('tapa', 0, 0, 'pza', { included: true }), ing('cuchara', 0, 0, 'pza')].map(i => [i.id, i]))
    expect(costBreakdown(product, map).missing).toEqual(['cuchara'])
  })
})
