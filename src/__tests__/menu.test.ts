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

describe('catálogo (menú v4)', () => {
  it('precios oficiales por experiencia y tamaño', () => {
    const esperado: [string, number][] = [
      ['Frésia en Nogada · Mediano 16 oz', 145], ['Frésia en Nogada · Grande 20 oz', 165],
      ['Clásica · Chico 12 oz', 95], ['Clásica · Mediano 16 oz', 115], ['Clásica · Grande 20 oz', 135],
      ['Uvas · Chico 12 oz', 105], ['Uvas · Mediano 16 oz', 125], ['Uvas · Grande 20 oz', 145],
      ['Mix Frésia · Chico 12 oz', 115], ['Mix Frésia · Mediano 16 oz', 135], ['Mix Frésia · Grande 20 oz', 155],
      ['Balance · Chico 12 oz', 105], ['Balance · Mediano 16 oz', 125], ['Balance · Grande 20 oz', 145],
      ['Chocolate · Chico 12 oz', 115], ['Chocolate · Mediano 16 oz', 135], ['Chocolate · Grande 20 oz', 155],
      ['Frèsia Brûlée · Mediano 16 oz', 135], ['Frèsia Brûlée · Grande 20 oz', 155],
      ['Waffle Frésia', 99],
      ['Té Relajante', 35], ['Té Frutal', 35], ['Té Fresco', 35], ['Té Detox', 35], ['Agua Santa María (1 L)', 25],
      ['Miel artesanal (500 g)', 270], ['Miel artesanal (70 g)', 65], ['Pepitas (70 g)', 25],
    ]
    for (const [name, price] of esperado) expect(prod(name).price, name).toBe(price)
    expect(products).toHaveLength(esperado.length)
  })

  it('lista única de 14 toppings: 8 incluidos y 6 premium a $25', () => {
    const toppings = ingredients.filter(i => i.toppingGroups?.length)
    expect(toppings).toHaveLength(14)
    for (const t of toppings) expect(t.toppingGroups, t.name).toEqual(['clasica', 'balance'])
    const premium = ['Pistache', 'Lotus', 'Chocolate Turín', 'Mermelada de fresa', 'Mermelada de zarzamora', 'Fresa fresca']
    for (const name of premium) expect(ing(name).premiumPrice, name).toBe(25)
    expect(toppings.filter(t => t.premiumPrice)).toHaveLength(premium.length)
    for (const name of ['Oreo triturada', 'Mazapán', 'Nuez picada', 'Arándano', 'Almendra fileteada', 'Cajeta', 'Coco rallado', 'Granola artesanal'])
      expect(ing(name).premiumPrice, name).toBeUndefined()
  })

  it('Frésia del mes: Nogada con nuez de Castilla y granada en la receta y 1 topping incluido', () => {
    const n = prod('Frésia en Nogada · Mediano 16 oz')
    expect(n.line).toBe('nogada')
    expect(n.toppingGroup).toBe('clasica')
    expect(n.includedToppings).toBe(1)
    const linea = (toppings: Ingredient[]) => ({ product: n, qty: 1, toppings, extras: [] })
    expect(lineUnitPrice(linea([ing('Cajeta')]))).toBe(145)
    expect(lineUnitPrice(linea([ing('Cajeta'), ing('Oreo triturada')]))).toBe(145 + EXTRA_TOPPING_PRICE)
    expect(lineUnitPrice(linea([ing('Pistache')]))).toBe(145 + 25)
    expect(n.recipe.some(r => r.ingredientId === ing('Nuez de Castilla').id)).toBe(true)
    expect(n.recipe.some(r => r.ingredientId === ing('Granada desgranada').id)).toBe(true)
    expect(products.some(p => p.name.startsWith('Frésia en Nogada · Chico'))).toBe(false)
  })

  it('Mix Frésia lleva uva y fresa; el Waffle lleva waffle y crema (sin fresa) con 2 toppings incluidos', () => {
    const m = prod('Mix Frésia · Grande 20 oz')
    expect(m.line).toBe('mix')
    expect(m.recipe.some(r => r.ingredientId === ing('Uva verde').id)).toBe(true)
    expect(m.recipe.some(r => r.ingredientId === ing('Fresa fresca').id)).toBe(true)
    const w = prod('Waffle Frésia')
    expect(w.line).toBe('waffle')
    expect(w.toppingGroup).toBe('clasica')
    expect(w.recipe.some(r => r.ingredientId === ing('Waffle').id)).toBe(true)
    expect(w.recipe.some(r => r.ingredientId === ing('Crema tradicional').id)).toBe(true)
    expect(w.recipe.some(r => r.ingredientId === ing('Fresa fresca').id)).toBe(false)
  })

  it('bebidas y despensa se venden por pieza, sin toppings', () => {
    for (const name of ['Té Relajante', 'Té Detox', 'Agua Santa María (1 L)', 'Miel artesanal (500 g)', 'Pepitas (70 g)']) {
      const p = prod(name)
      expect(p.toppingGroup, name).toBeUndefined()
      expect(p.recipe, name).toHaveLength(1)
      expect(p.recipe[0].qty, name).toBe(1)
    }
    expect(prod('Té Fresco').line).toBe('bebidas')
    expect(prod('Miel artesanal (70 g)').line).toBe('despensa')
  })

  it('Brûlée solo Mediano y Grande, con toppings elegibles y azúcar en la receta', () => {
    const b = prod('Frèsia Brûlée · Mediano 16 oz')
    expect(b.line).toBe('brulee')
    expect(b.toppingGroup).toBe('clasica')
    expect(b.recipe.some(r => r.ingredientId === ing('Azúcar para brûlée').id)).toBe(true)
    expect(products.some(p => p.name.startsWith('Frèsia Brûlée · Chico'))).toBe(false)
  })

  it('la línea Chocolate lleva Chocolate Turín en la receta', () => {
    const p = prod('Chocolate · Mediano 16 oz')
    expect(p.recipe.some(r => r.ingredientId === ing('Chocolate Turín').id)).toBe(true)
  })

  it('Uvas lleva uva verde (no fresa), crema y toppings elegibles', () => {
    const p = prod('Uvas · Mediano 16 oz')
    expect(p.line).toBe('uvas')
    expect(p.toppingGroup).toBe('clasica')
    expect(p.recipe.some(r => r.ingredientId === ing('Uva verde').id)).toBe(true)
    expect(p.recipe.some(r => r.ingredientId === ing('Fresa fresca').id)).toBe(false)
    expect(p.recipe.some(r => r.ingredientId === ing('Crema tradicional').id)).toBe(true)
  })

  it('sin extras sueltos ni tamaños del menú anterior', () => {
    for (const p of products) {
      expect(p.extraScope ?? [], p.name).toHaveLength(0)
      expect(p.name).not.toMatch(/Extra|Mini|Chica|Mediana|\d+\s*ml/i)
    }
  })

  it('todo vaso lleva empaque completo: vaso, tapa, cuchara, servilleta y sello', () => {
    const vasos = products.filter(x => x.name.includes('·'))
    expect(vasos).toHaveLength(19)
    for (const p of vasos) {
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

  it('topping doble: dos porciones del mismo cuentan como dos toppings', () => {
    // doble cajeta sola usa los 2 incluidos; con otro más, la repetición cobra extra
    expect(lineUnitPrice(linea([ing('Cajeta'), ing('Cajeta')]))).toBe(115)
    expect(lineUnitPrice(linea([ing('Cajeta'), ing('Cajeta'), ing('Oreo triturada')]))).toBe(115 + EXTRA_TOPPING_PRICE)
    expect(lineUnitPrice(linea([ing('Pistache'), ing('Pistache')]))).toBe(115 + 2 * 25)
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
