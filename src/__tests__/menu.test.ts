import 'fake-indexeddb/auto'
import { beforeAll, describe, expect, it } from 'vitest'
import { db } from '../data/db'
import { seed } from '../data/seed'
import type { Ingredient, Product } from '../data/types'
import { checkout, lineUnitPrice, setSalePayment, voidSale, EXTRA_TOPPING_PRICE, INCLUDED_TOPPINGS } from '../services/sales'

let products: Product[] = []
let ingredients: Ingredient[] = []
const prod = (name: string) => products.find(p => p.name === name)!
const ing = (name: string) => ingredients.find(i => i.name === name)!

beforeAll(async () => {
  await db.open()
  await seed()
  products = await db.products.toArray()
  ingredients = await db.ingredients.toArray()
})

describe('catálogo (menú v3)', () => {
  it('precios oficiales por experiencia y tamaño', () => {
    const esperado: [string, number][] = [
      ['Clásica · Chico 12 oz', 95], ['Clásica · Mediano 16 oz', 115], ['Clásica · Grande 20 oz', 135],
      ['Balance · Chico 12 oz', 105], ['Balance · Mediano 16 oz', 125], ['Balance · Grande 20 oz', 145],
      ['Chocolate · Chico 12 oz', 115], ['Chocolate · Mediano 16 oz', 135], ['Chocolate · Grande 20 oz', 155],
      ['Frèsia Brûlée · Mediano 16 oz', 135], ['Frèsia Brûlée · Grande 20 oz', 155],
    ]
    for (const [name, price] of esperado) expect(prod(name).price, name).toBe(price)
    expect(products).toHaveLength(esperado.length)
  })

  it('lista única de 11 toppings; Pistache y Lotus premium a $25', () => {
    const toppings = ingredients.filter(i => i.toppingGroups?.length)
    expect(toppings).toHaveLength(11)
    for (const t of toppings) expect(t.toppingGroups, t.name).toEqual(['clasica', 'balance'])
    expect(ing('Pistache').premiumPrice).toBe(25)
    expect(ing('Lotus').premiumPrice).toBe(25)
    expect(toppings.filter(t => t.premiumPrice)).toHaveLength(2)
  })

  it('Brûlée solo Mediano y Grande, sin toppings elegibles y con azúcar en la receta', () => {
    const b = prod('Frèsia Brûlée · Mediano 16 oz')
    expect(b.line).toBe('brulee')
    expect(b.toppingGroup).toBeUndefined()
    expect(b.recipe.some(r => r.ingredientId === ing('Azúcar para brûlée').id)).toBe(true)
    expect(products.some(p => p.name.startsWith('Frèsia Brûlée · Chico'))).toBe(false)
  })

  it('la línea Chocolate lleva Chocolate Turín en la receta', () => {
    const p = prod('Chocolate · Mediano 16 oz')
    expect(p.recipe.some(r => r.ingredientId === ing('Chocolate Turín').id)).toBe(true)
  })

  it('sin extras sueltos ni tamaños del menú anterior', () => {
    for (const p of products) {
      expect(p.extraScope ?? [], p.name).toHaveLength(0)
      expect(p.name).not.toMatch(/Extra|Mini|Chica|Mediana|\d+\s*ml/i)
    }
  })

  it('todo vaso lleva empaque completo: vaso, tapa, cuchara, servilleta y sello', () => {
    for (const p of products.filter(x => x.line)) {
      const nombres = p.recipe.map(r => ingredients.find(i => i.id === r.ingredientId)?.name ?? '')
      expect(nombres.some(n => n.startsWith('Vaso PET')), p.name).toBe(true)
      expect(nombres.some(n => n.startsWith('Tapa')), p.name).toBe(true)
      for (const req of ['Cuchara', 'Servilleta', 'Sticker / sello Frésia'])
        expect(nombres, `${p.name} → ${req}`).toContain(req)
    }
  })
})

describe('precios en el punto de venta', () => {
  const linea = (toppings: Ingredient[]) =>
    ({ product: prod('Clásica · Mediano 16 oz'), qty: 1, toppings, extras: [] })

  it('2 toppings incluidos no cambian el precio', () => {
    expect(lineUnitPrice(linea([ing('Cajeta'), ing('Oreo triturada')]))).toBe(115)
  })

  it('cobra desde el tercer topping a $18', () => {
    expect(lineUnitPrice(linea([ing('Cajeta'), ing('Oreo triturada'), ing('Coco rallado')]))).toBe(115 + EXTRA_TOPPING_PRICE)
    expect(lineUnitPrice(linea([ing('Cajeta'), ing('Oreo triturada'), ing('Coco rallado'), ing('Mazapán')]))).toBe(115 + 2 * EXTRA_TOPPING_PRICE)
  })

  it('premium siempre se cobra a $25 y no gasta un incluido', () => {
    expect(lineUnitPrice(linea([ing('Pistache')]))).toBe(115 + 25)
    expect(lineUnitPrice(linea([ing('Cajeta'), ing('Oreo triturada'), ing('Pistache')]))).toBe(115 + 25)
    expect(lineUnitPrice(linea([ing('Cajeta'), ing('Oreo triturada'), ing('Coco rallado'), ing('Lotus')]))).toBe(115 + EXTRA_TOPPING_PRICE + 25)
  })

  it('constantes de la regla comercial', () => {
    expect(INCLUDED_TOPPINGS).toBe(2)
    expect(EXTRA_TOPPING_PRICE).toBe(18)
  })
})

describe('checkout descuenta inventario', () => {
  it('venta con toppings: receta base + porciones', async () => {
    const before = new Map((await db.ingredients.toArray()).map(i => [i.name, i.stock]))
    await checkout(
      [{ product: prod('Balance · Chico 12 oz'), qty: 1, toppings: [ing('Cajeta'), ing('Pistache')], extras: [] }],
      'efectivo',
    )
    const after = new Map((await db.ingredients.toArray()).map(i => [i.name, i.stock]))
    const delta = (n: string) => (before.get(n) ?? 0) - (after.get(n) ?? 0)
    expect(delta('Fresa fresca')).toBe(170)
    expect(delta('Yogurt griego')).toBe(140)
    expect(delta('Cajeta')).toBe(20)
    expect(delta('Pistache')).toBe(12)
    expect(delta('Vaso PET 12 oz')).toBe(1)
    expect(delta('Tapa plana')).toBe(1)
    expect(delta('Servilleta')).toBe(1)

    const sale = (await db.sales.toArray())[0]
    expect(sale.total).toBe(105 + 25)   // premium siempre con cargo
    expect(sale.items[0].toppings).toEqual(['Cajeta', 'Pistache'])
  })
})

describe('anular y corregir ventas', () => {
  it('corregir el método de cobro conserva todo lo demás', async () => {
    const id = await checkout([{ product: prod('Clásica · Chico 12 oz'), qty: 1, toppings: [], extras: [] }], 'efectivo')
    await setSalePayment(id, 'tarjeta')
    const sale = await db.sales.get(id)
    expect(sale?.payment).toBe('tarjeta')
    expect(sale?.total).toBe(95)
  })

  it('anular elimina la venta y regresa los insumos al inventario', async () => {
    const before = new Map((await db.ingredients.toArray()).map(i => [i.name, i.stock]))
    const id = await checkout(
      [{ product: prod('Clásica · Mediano 16 oz'), qty: 2, toppings: [ing('Cajeta')], extras: [] }],
      'efectivo',
    )
    await voidSale(id)
    expect(await db.sales.get(id)).toBeUndefined()
    const after = new Map((await db.ingredients.toArray()).map(i => [i.name, i.stock]))
    for (const [name, stock] of before) expect(after.get(name), name).toBe(stock)
  })
})
