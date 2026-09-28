import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../data/db'
import type { Ingredient, Product } from '../data/types'
import { checkout, type CartLine } from '../services/sales'
import { cancelTab, saveTab, tabToCart, tiempoAbierta, undoTabCharge } from '../services/tabs'
import { toCloud } from '../services/sync/mapping'
import { fromCloud } from '../services/sync/restore'

const fresa: Ingredient = { id: 'i-fresa', name: 'Fresa', unit: 'g', stock: 1000, cost: 0.1, minStock: 0 }
const nuez: Ingredient = { id: 'i-nuez', name: 'Nuez', unit: 'g', stock: 500, cost: 0.5, minStock: 0, portion: 10, toppingGroups: ['clasica'] }
const vaso: Product = { id: 'p-vaso', name: 'Clásica · Chico', emoji: '', price: 95, recipe: [{ ingredientId: 'i-fresa', qty: 100 }], active: true, sort: 1, toppingGroup: 'clasica' }
const te: Product = { id: 'p-te', name: 'Té Frutal', emoji: '', price: 35, recipe: [], active: true, sort: 2 }

const stock = async (id: string) => (await db.ingredients.get(id))!.stock
const linea = (product: Product, qty: number, toppings: Ingredient[] = []): CartLine => ({ product, qty, toppings, extras: [] })

beforeEach(async () => {
  await db.open()
  for (const t of [db.ingredients, db.products, db.openTabs, db.sales, db.wastes, db.outbox]) await t.clear()
  await db.ingredients.bulkPut([fresa, nuez])
  await db.products.bulkPut([vaso, te])
})

describe('cuentas abiertas', () => {
  it('al guardar la cuenta se descuentan los insumos y no hay venta', async () => {
    const id = await saveTab([linea(vaso, 2, [nuez, nuez])], 'Mesa 2')
    expect(await stock('i-fresa')).toBe(800)
    expect(await stock('i-nuez')).toBe(460) // doble nuez × 2 vasos
    expect(await db.sales.count()).toBe(0)
    const tab = (await db.openTabs.get(id))!
    expect(tab).toMatchObject({ name: 'Mesa 2', used: { 'i-fresa': 200, 'i-nuez': 40 } })
    expect(tab.total).toBe(2 * (95 + 0)) // la nuez va dentro de los 2 incluidos
  })

  it('al agregar productos solo se descuenta lo nuevo', async () => {
    const id = await saveTab([linea(vaso, 1)], 'Mesa 1')
    const tab = (await db.openTabs.get(id))!
    const cart = await tabToCart(tab)
    cart[0] = { ...cart[0], qty: 3 }
    await saveTab([...cart, linea(te, 1)], 'Mesa 1', id)
    expect(await stock('i-fresa')).toBe(700)
    const actual = (await db.openTabs.get(id))!
    expect(actual.used).toEqual({ 'i-fresa': 300 })
    expect(actual.total).toBe(3 * 95 + 35)
    expect(actual.openTs).toBe(tab.openTs)
  })

  it('al quitar un producto antes de servirlo el insumo regresa', async () => {
    const id = await saveTab([linea(vaso, 2)], 'Mesa 1')
    await saveTab([linea(vaso, 1)], 'Mesa 1', id)
    expect(await stock('i-fresa')).toBe(900)
  })

  it('al cobrar no se vuelve a descontar, la cuenta desaparece y la venta queda', async () => {
    const id = await saveTab([linea(vaso, 2)], 'Mesa 3')
    const cart = await tabToCart((await db.openTabs.get(id))!)
    const saleId = await checkout(cart, 'efectivo', 20, id)
    expect(await stock('i-fresa')).toBe(800)
    expect(await db.openTabs.count()).toBe(0)
    expect((await db.sales.get(saleId))!).toMatchObject({ total: 190, tip: 20, payment: 'efectivo' })
    const borrado = (await db.outbox.toArray()).find(e => e.table === 'openTabs' && e.op === 'delete')
    expect(borrado?.row.id).toBe(id)
  })

  it('lo que se agrega en el momento de cobrar sí se descuenta', async () => {
    const id = await saveTab([linea(vaso, 1)], 'Barra')
    const cart = await tabToCart((await db.openTabs.get(id))!)
    await checkout([{ ...cart[0], qty: 2 }], 'tarjeta', 0, id)
    expect(await stock('i-fresa')).toBe(800)
  })

  it('cancelar deja los insumos gastados y los registra como merma', async () => {
    const id = await saveTab([linea(vaso, 1, [nuez])], 'Señora de rojo')
    await cancelTab(id, 'se fue sin pagar')
    expect(await db.openTabs.count()).toBe(0)
    expect(await stock('i-fresa')).toBe(900)
    const mermas = await db.wastes.toArray()
    expect(mermas.map(m => [m.ingredientName, m.qty])).toEqual(expect.arrayContaining([['Fresa', 100], ['Nuez', 10]]))
    expect(mermas[0].reason).toBe('Cuenta cancelada · Señora de rojo: se fue sin pagar')
  })

  it('deshacer el cobro vuelve a abrir la cuenta sin mover el inventario', async () => {
    const id = await saveTab([linea(vaso, 2)], 'Mesa 4')
    const tab = (await db.openTabs.get(id))!
    const saleId = await checkout(await tabToCart(tab), 'efectivo', 0, id)
    await undoTabCharge(saleId, tab)
    expect(await db.sales.count()).toBe(0)
    expect((await db.openTabs.get(id))?.name).toBe('Mesa 4')
    expect(await stock('i-fresa')).toBe(800)
  })

  it('un producto que ya no existe se conserva con su nombre y precio', async () => {
    const id = await saveTab([linea(te, 2)], 'Mesa 5')
    await db.products.delete('p-te')
    const [l] = await tabToCart((await db.openTabs.get(id))!)
    expect(l.product).toMatchObject({ name: 'Té Frutal', price: 35 })
    expect(l.qty).toBe(2)
  })

  it('viaja a la base de datos y regresa igual', async () => {
    const id = await saveTab([linea(vaso, 1, [nuez])], 'Mesa 6')
    const tab = (await db.openTabs.get(id))!
    const nube = toCloud.openTabs.map(tab as unknown as Record<string, unknown>, 'Principal')
    expect(nube).toMatchObject({ name: 'Mesa 6', total: 95, used: { 'i-fresa': 100, 'i-nuez': 10 } })
    expect(fromCloud.openTabs({ ...nube, total: '95' })).toMatchObject({ id, name: 'Mesa 6', openTs: tab.openTs, total: 95, lines: tab.lines })
  })

  it('dice cuánto lleva abierta', () => {
    const now = 10_000_000
    expect(tiempoAbierta(now - 20_000, now)).toBe('recién')
    expect(tiempoAbierta(now - 25 * 60_000, now)).toBe('hace 25 min')
    expect(tiempoAbierta(now - 80 * 60_000, now)).toBe('hace 1 h 20 min')
  })
})
