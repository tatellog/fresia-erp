import { db } from '../data/db'
import { uid } from '../data/ids'
import type { Ingredient, OpenTab, Product, TabLine, Waste } from '../data/types'
import { round2 } from '../lib/format'
import { enqueue } from './outbox'
import { applyUsage, cartUsage, lineUnitPrice, voidSale, type CartLine } from './sales'

/**
 * Cuentas abiertas: el cliente pide, se le sirve y paga al final.
 *
 * Los insumos se descuentan al guardar la cuenta, porque se usan al
 * preparar el vaso. Cada cuenta recuerda cuánto descontó (`used`): al
 * volver a guardarla con cambios solo se mueve la diferencia, y al
 * cobrarla la venta no vuelve a descontar lo que ya salió.
 */

const toRecord = (m: Map<string, number>) =>
  Object.fromEntries([...m].filter(([, q]) => q !== 0).map(([id, q]) => [id, round2(q)]))

/** renglones de la cuenta a partir del carrito */
export function tabLines(cart: CartLine[]): TabLine[] {
  return cart.map(l => ({
    productId: l.product.id,
    qty: l.qty,
    toppingIds: l.toppings.map(t => t.id),
    extraIds: l.extras.map(e => e.id),
    name: l.product.name,
    price: lineUnitPrice(l),
    toppings: l.toppings.length ? l.toppings.map(t => t.name) : undefined,
    extras: l.extras.length ? l.extras.map(e => e.name) : undefined,
  }))
}

/**
 * Guarda una cuenta nueva o actualiza una existente. Descuenta del
 * inventario solo lo que cambió desde la última vez que se guardó.
 * Devuelve el id de la cuenta.
 */
export async function saveTab(cart: CartLine[], name: string, tabId?: string): Promise<string> {
  return db.transaction('rw', [db.openTabs, db.ingredients, db.outbox, db.meta, db.employees], async () => {
    const previa = tabId ? await db.openTabs.get(tabId) : undefined
    const usage = cartUsage(cart)
    const delta = new Map(usage)
    for (const [id, qty] of Object.entries(previa?.used ?? {})) delta.set(id, (delta.get(id) ?? 0) - qty)
    await applyUsage(delta)

    const activeId = (await db.meta.get('activeEmployeeId'))?.value
    const employee = activeId ? await db.employees.get(activeId) : undefined
    const lines = tabLines(cart)
    const tab: OpenTab = {
      id: previa?.id ?? uid(),
      name: name.trim() || 'Cuenta',
      openTs: previa?.openTs ?? Date.now(),
      lines,
      total: round2(lines.reduce((s, l) => s + l.price * l.qty, 0)),
      used: toRecord(usage),
      employeeName: previa?.employeeName ?? employee?.name,
    }
    await db.openTabs.put(tab)
    await enqueue('openTabs', 'upsert', tab)
    return tab.id
  })
}

/**
 * Rearma el carrito de una cuenta con el catálogo actual. Si un producto
 * ya no existe se conserva con su nombre y precio de cuando se guardó.
 */
export async function tabToCart(tab: OpenTab): Promise<CartLine[]> {
  const products = new Map((await db.products.toArray()).map(p => [p.id, p]))
  const ingredients = new Map((await db.ingredients.toArray()).map(i => [i.id, i]))
  return tab.lines.map(l => {
    const product = products.get(l.productId)
    if (!product) {
      const suelto: Product = { id: l.productId, name: l.name, emoji: '', price: l.price, recipe: [], active: false, sort: 0 }
      return { product: suelto, qty: l.qty, toppings: [], extras: [] }
    }
    return {
      product,
      qty: l.qty,
      toppings: l.toppingIds.map(id => ingredients.get(id)).filter((t): t is Ingredient => !!t),
      extras: l.extraIds.map(id => products.get(id)).filter((e): e is Product => !!e),
    }
  })
}

/**
 * Cancela una cuenta que no se va a cobrar (el cliente se fue sin pagar o
 * fue un error). Los insumos no regresan porque sí se usaron: quedan como
 * merma con el motivo, para que la pérdida se vea.
 */
export async function cancelTab(tabId: string, reason: string) {
  return db.transaction('rw', [db.openTabs, db.ingredients, db.wastes, db.outbox], async () => {
    const tab = await db.openTabs.get(tabId)
    if (!tab) return
    const motivo = `Cuenta cancelada · ${tab.name}${reason.trim() ? `: ${reason.trim()}` : ''}`
    for (const [ingredientId, qty] of Object.entries(tab.used)) {
      if (!(qty > 0)) continue
      const ing = await db.ingredients.get(ingredientId)
      const waste: Waste = { id: uid(), ts: Date.now(), ingredientId, ingredientName: ing?.name ?? ingredientId, qty, reason: motivo }
      await db.wastes.add(waste)
      await enqueue('wastes', 'upsert', waste)
    }
    await db.openTabs.delete(tab.id)
    await enqueue('openTabs', 'delete', { id: tab.id })
  })
}

/**
 * Deshace el cobro de una cuenta: anula la venta (que repone insumos) y
 * vuelve a abrir la cuenta tal como estaba (que los descuenta de nuevo).
 */
export async function undoTabCharge(saleId: string, tab: OpenTab) {
  await voidSale(saleId)
  await db.transaction('rw', [db.openTabs, db.ingredients, db.outbox], async () => {
    await applyUsage(new Map(Object.entries(tab.used)))
    await db.openTabs.put(tab)
    await enqueue('openTabs', 'upsert', tab)
  })
}

/** "hace 5 min", "hace 1 h 20 min" */
export function tiempoAbierta(openTs: number, now = Date.now()): string {
  const min = Math.max(0, Math.floor((now - openTs) / 60_000))
  if (min < 1) return 'recién'
  if (min < 60) return `hace ${min} min`
  const h = Math.floor(min / 60), m = min % 60
  return m ? `hace ${h} h ${m} min` : `hace ${h} h`
}
