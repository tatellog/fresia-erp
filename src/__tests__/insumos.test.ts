import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../data/db'
import { deleteIngredient, registerPurchase, registerWaste, saveIngredient } from '../services/inventory'
import { copyToppings, setIngredientInList } from '../services/toppingLists'

const byName = async (name: string) => (await db.ingredients.toArray()).find(i => i.name === name)!

beforeEach(async () => {
  await db.open()
  await db.ingredients.clear()
  await db.purchases.clear()
  await db.wastes.clear()
  await db.outbox.clear()
})

describe('CRUD de insumos', () => {
  it('alta: guarda el insumo con existencia en 0 y lo encola para la nube', async () => {
    await saveIngredient({ name: 'Chispas de chocolate', unit: 'g', cost: 0.5, minStock: 200 })
    const nuevo = await byName('Chispas de chocolate')
    expect(nuevo).toMatchObject({ unit: 'g', cost: 0.5, minStock: 200, stock: 0 })
    expect(nuevo.id).toBeTruthy()
    const cola = await db.outbox.toArray()
    expect(cola).toHaveLength(1)
    expect(cola[0]).toMatchObject({ table: 'ingredients', op: 'upsert' })
  })

  it('alta de topping: grupos, porción y precio premium', async () => {
    await saveIngredient({ name: 'Brownie', unit: 'g', cost: 1, minStock: 100, toppingGroups: ['clasica', 'balance'], portion: 30, premiumPrice: 25 })
    expect(await byName('Brownie')).toMatchObject({ toppingGroups: ['clasica', 'balance'], portion: 30, premiumPrice: 25 })
  })

  it('edición: cambia los datos y conserva la existencia y el costo promedio de las compras', async () => {
    await saveIngredient({ name: 'Chispas', unit: 'g', cost: 0, minStock: 100 })
    const original = await byName('Chispas')
    await registerPurchase(original.id, 500, 250)

    // la hoja de edición se abrió antes de la compra: guarda con esa foto vieja
    await saveIngredient({ name: 'Chispas de chocolate', unit: 'g', cost: 0.5, minStock: 150 }, original)

    const editado = await byName('Chispas de chocolate')
    expect(editado.id).toBe(original.id)
    expect(editado.stock).toBe(500)
    expect(editado.minStock).toBe(150)
    expect(await db.ingredients.count()).toBe(1)
  })

  it('edición: quitar el grupo de toppings lo saca del punto de venta', async () => {
    await saveIngredient({ name: 'Brownie', unit: 'g', cost: 1, minStock: 100, toppingGroups: ['clasica'], portion: 30, premiumPrice: 25 })
    const brownie = await byName('Brownie')
    await saveIngredient({ name: 'Brownie', unit: 'g', cost: 1, minStock: 100, toppingGroups: undefined, portion: undefined, premiumPrice: undefined }, brownie)
    const plano = await byName('Brownie')
    expect(plano.toppingGroups).toBeUndefined()
    expect(plano.portion).toBeUndefined()
    expect(plano.premiumPrice).toBeUndefined()
  })

  it('listas de toppings: marcar desde el producto mete el insumo con porción y desmarcar lo saca', async () => {
    await saveIngredient({ name: 'Nutella', unit: 'g', cost: 1, minStock: 100 })
    const nutella = await byName('Nutella')

    await setIngredientInList(nutella, 'waffle', true)
    const topping = await byName('Nutella')
    expect(topping.toppingGroups).toEqual(['waffle'])
    // sin porción el topping no descontaría inventario: estrena una
    expect(topping.portion).toBeGreaterThan(0)

    await setIngredientInList(topping, 'waffle', false)
    expect((await byName('Nutella')).toppingGroups).toBeUndefined()
  })

  it('listas de toppings: marcar una segunda lista conserva la primera', async () => {
    await saveIngredient({ name: 'Cajeta', unit: 'ml', cost: 1, minStock: 100, toppingGroups: ['clasica'], portion: 20 })
    await setIngredientInList(await byName('Cajeta'), 'waffle', true)
    const dos = await byName('Cajeta')
    expect(dos.toppingGroups).toEqual(['clasica', 'waffle'])
    expect(dos.portion).toBe(20)
  })

  it('listas de toppings: una lista nueva se estrena copiando los toppings de otra', async () => {
    await saveIngredient({ name: 'Fresa', unit: 'g', cost: 1, minStock: 100, toppingGroups: ['clasica'], portion: 40 })
    await saveIngredient({ name: 'Nuez', unit: 'g', cost: 1, minStock: 100, toppingGroups: ['clasica'], portion: 12 })
    await saveIngredient({ name: 'Vaso', unit: 'pza', cost: 1, minStock: 100 })

    await copyToppings('clasica', 'waffle')

    const enWaffle = (await db.ingredients.toArray()).filter(i => (i.toppingGroups ?? []).includes('waffle')).map(i => i.name)
    expect(enWaffle.sort()).toEqual(['Fresa', 'Nuez'])
  })

  it('compra y merma mueven la existencia del insumo dado de alta', async () => {
    await saveIngredient({ name: 'Chispas', unit: 'g', cost: 0, minStock: 100 })
    const ing = await byName('Chispas')
    await registerPurchase(ing.id, 400, 200)
    expect((await byName('Chispas')).cost).toBe(0.5)
    await registerWaste(ing.id, 50, 'se cayó')
    expect((await byName('Chispas')).stock).toBe(350)
    expect(await db.purchases.count()).toBe(1)
    expect(await db.wastes.count()).toBe(1)
  })

  it('baja: borra el insumo y encola el borrado', async () => {
    await saveIngredient({ name: 'Chispas', unit: 'g', cost: 0, minStock: 100 })
    const ing = await byName('Chispas')
    await db.outbox.clear()
    await deleteIngredient(ing.id)
    expect(await db.ingredients.count()).toBe(0)
    expect((await db.outbox.toArray())[0]).toMatchObject({ table: 'ingredients', op: 'delete' })
  })
})
