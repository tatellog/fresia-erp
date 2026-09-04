import { db } from '../data/db'
import { uid } from '../data/ids'
import type { Ingredient, ToppingGroup, ToppingList } from '../data/types'
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

/** crea una lista nueva (vacía: los toppings se le asignan desde Insumos) y devuelve su id */
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
