import 'fake-indexeddb/auto'
import { beforeAll, describe, expect, it } from 'vitest'
import { db } from '../data/db'
import { seed } from '../data/seed'
import type { Ingredient, Product } from '../data/types'
import { checkout, lineUnitPrice, EXTRA_TOPPING_PRICE, INCLUDED_TOPPINGS } from '../services/sales'

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

describe('catálogo (menú v2)', () => {
  it('precios oficiales por línea y tamaño', () => {
    const esperado: [string, number][] = [
      ['Clásica · Mini 250 ml', 69], ['Clásica · Chica 350 ml', 89], ['Clásica · Mediana 500 ml', 109], ['Clásica · Grande 700 ml', 139],
      ['Chocolate · Mini 250 ml', 79], ['Chocolate · Chica 350 ml', 99], ['Chocolate · Mediana 500 ml', 119], ['Chocolate · Grande 700 ml', 149],
      ['Balance · Mini 250 ml', 85], ['Balance · Chica 350 ml', 105], ['Balance · Mediana 500 ml', 125], ['Balance · Grande 700 ml', 155],
    ]
    for (const [name, price] of esperado) expect(prod(name).price, name).toBe(price)
  })

  it('sin bebidas, combos, Fresi Fit ni 1 litro', () => {
    for (const p of products) {
      expect(p.name).not.toMatch(/Agua|Café|Combo|Fresi|1 litro|Mini 1000/i)
    }
  })

  it('10 toppings clásicos y 8 Balance elegibles', () => {
    const clasicos = ingredients.filter(i => i.toppingGroups?.includes('clasica'))
    const balance = ingredients.filter(i => i.toppingGroups?.includes('balance'))
    expect(clasicos).toHaveLength(10)
    expect(balance).toHaveLength(8)
    // almendra y nuez compartidas; los cocos son insumos distintos
    expect(ing('Almendra fileteada').toppingGroups).toEqual(['clasica', 'balance'])
    expect(ing('Coco rallado').toppingGroups).toEqual(['clasica'])
    expect(ing('Coco sin azúcar').toppingGroups).toEqual(['balance'])
  })

  it('la línea Chocolate usa toppings clásicos y lleva salsa en la receta', () => {
    const p = prod('Chocolate · Mediana 500 ml')
    expect(p.toppingGroup).toBe('clasica')
    expect(p.recipe.some(r => r.ingredientId === ing('Salsa de chocolate').id)).toBe(true)
  })

  it('reglas de extras por línea', () => {
    expect(prod('Fresa extra').extraScope).toEqual(['clasica', 'chocolate', 'balance'])
    expect(prod('Extra crema').extraScope).toEqual(['clasica', 'chocolate'])       // no en Balance
    expect(prod('Extra yogurt griego').extraScope).toEqual(['balance'])            // no en Clásica
    expect(prod('Extra proteína 10 g').extraScope).toEqual(['balance'])            // no en Clásica
    expect(prod('Extra yogurt griego').price).toBe(20)
    expect(prod('Extra proteína 10 g').price).toBe(20)
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
  const linea = (toppings: Ingredient[], extras: Product[] = []) =>
    ({ product: prod('Clásica · Mediana 500 ml'), qty: 1, toppings, extras })

  it('2 toppings incluidos no cambian el precio', () => {
    expect(lineUnitPrice(linea([ing('Cajeta'), ing('Lechera')]))).toBe(109)
  })

  it('cobra desde el tercer topping', () => {
    expect(lineUnitPrice(linea([ing('Cajeta'), ing('Lechera'), ing('Brownie')]))).toBe(109 + EXTRA_TOPPING_PRICE)
    expect(lineUnitPrice(linea([ing('Cajeta'), ing('Lechera'), ing('Brownie'), ing('Oreo triturada')]))).toBe(109 + 2 * EXTRA_TOPPING_PRICE)
  })

  it('extras se suman al precio', () => {
    expect(lineUnitPrice(linea([ing('Cajeta'), ing('Lechera')], [prod('Fresa extra'), prod('Extra crema')]))).toBe(109 + 20 + 15)
  })

  it('constantes de la regla comercial', () => {
    expect(INCLUDED_TOPPINGS).toBe(2)
    expect(EXTRA_TOPPING_PRICE).toBe(15)
  })
})

describe('checkout descuenta inventario', () => {
  it('venta con toppings y extra: receta base + porciones + extra', async () => {
    const before = new Map((await db.ingredients.toArray()).map(i => [i.name, i.stock]))
    await checkout(
      [{ product: prod('Balance · Chica 350 ml'), qty: 1, toppings: [ing('Chía'), ing('Pistache')], extras: [prod('Extra proteína 10 g')] }],
      'efectivo',
    )
    const after = new Map((await db.ingredients.toArray()).map(i => [i.name, i.stock]))
    const delta = (n: string) => (before.get(n) ?? 0) - (after.get(n) ?? 0)
    expect(delta('Fresa fresca')).toBe(170)
    expect(delta('Yogurt griego')).toBe(140)
    expect(delta('Proteína en polvo')).toBe(20 + 10)   // base + extra
    expect(delta('Chía')).toBe(10)
    expect(delta('Pistache')).toBe(12)
    expect(delta('Vaso PET 350 ml')).toBe(1)
    expect(delta('Tapa plana')).toBe(1)
    expect(delta('Servilleta')).toBe(1)

    const sale = (await db.sales.toArray())[0]
    expect(sale.total).toBe(105 + 20)
    expect(sale.items[0].toppings).toEqual(['Chía', 'Pistache'])
    expect(sale.items[0].extras).toEqual(['Extra proteína 10 g'])
  })
})
