import { db } from '../data/db'
import { uid } from '../data/ids'
import type { Ingredient, ToppingGroup, ToppingList, Unit } from '../data/types'
import { saveIngredient } from './inventory'
import { enqueue } from './outbox'

/** listas con las que nació el menú; existen en todo dispositivo aunque la nube no las traiga */
export const DEFAULT_TOPPING_LISTS: ToppingList[] = [
  { id: 'clasica', name: 'Clásica', sort: 1 },
  { id: 'balance', name: 'Balance', sort: 2 },
]

/** garantiza las listas originales sin pisar las que ya existan */
export async function ensureToppingLists() {
  const existing = new Set((await db.toppingLists.toArray()).map(l => l.id))
  const missing = DEFAULT_TOPPING_LISTS.filter(l => !existing.has(l.id))
  if (missing.length) await db.toppingLists.bulkPut(missing)
}

/** crea una lista nueva (vacía: los toppings se le asignan desde Inventario) y devuelve su id */
export async function createToppingList(name: string): Promise<ToppingGroup> {
  const id = uid()
  return db.transaction('rw', [db.toppingLists, db.outbox], async () => {
    const sort = (await db.toppingLists.count()) + 1
    const row: ToppingList = { id, name: name.trim(), sort }
    await db.toppingLists.put(row)
    await enqueue('toppingLists', 'upsert', row)
    return id
  })
}

/** nombre legible de una lista; si ya no existe, su id */
export const toppingListName = (lists: ToppingList[], id: ToppingGroup) =>
  lists.find(l => l.id === id)?.name ?? id

/** cuántos toppings tiene asignados cada lista */
export const toppingCountByList = (ingredients: Ingredient[]) => {
  const count = new Map<ToppingGroup, number>()
  for (const i of ingredients) for (const g of i.toppingGroups ?? []) count.set(g, (count.get(g) ?? 0) + 1)
  return count
}

/** porción con la que estrena un insumo que se vuelve topping (se corrige en Inventario) */
export const defaultPortion = (unit: Unit) => (unit === 'pza' ? 1 : 20)

/** mete o saca un insumo de una lista de toppings, guardando al momento */
export async function setIngredientInList(ing: Ingredient, group: ToppingGroup, on: boolean) {
  const groups = (ing.toppingGroups ?? []).filter(g => g !== group)
  if (on) groups.push(group)
  await saveIngredient({
    ...ing,
    toppingGroups: groups.length ? groups : undefined,
    // sin porción el topping no descontaría nada del inventario
    portion: on ? ing.portion || defaultPortion(ing.unit) : ing.portion,
  }, ing)
}

/** mete varios insumos a una lista de un golpe */
export async function addToList(ings: Ingredient[], group: ToppingGroup) {
  for (const i of ings) await setIngredientInList(i, group, true)
}

/** estrena una lista con los mismos toppings de otra */
export async function copyToppings(from: ToppingGroup, to: ToppingGroup) {
  await addToList(await db.ingredients.filter(i => (i.toppingGroups ?? []).includes(from)).toArray(), to)
}
