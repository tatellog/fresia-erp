import { db } from '../data/db'
import { uid } from '../data/ids'
import type { Employee, Expense, Ingredient, Payment, Product, Sale, SaleItem } from '../data/types'
import { round2, startOfDay } from '../lib/format'
import { productCost } from './costing'
import { EXTRA_TOPPING_PRICE, INCLUDED_TOPPINGS } from './sales'

/** generador determinista para que la demo sea reproducible */
function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** costo unitario realista por insumo (MXN por g/ml/pza) para la demo */
const DEMO_COSTS: Record<string, number> = {
  'Fresa': 0.085, 'Crema tradicional': 0.055, 'Yogurt griego': 0.09,
  'Vaso mini 250 ml': 3.2, 'Vaso chico 350 ml': 3.8, 'Vaso mediano 500 ml': 4.5, 'Vaso grande 700 ml': 5.2,
  'Cuchara': 0.4, 'Agua del día (botella)': 7, 'Café frío (preparado)': 12,
  'Miel de abeja natural': 0.15, 'Fruta de temporada': 0.06,
  'Granola artesanal': 0.12, 'Cajeta': 0.09, 'Chocolate': 0.11, 'Lechera': 0.07,
  'Chispas de chocolate': 0.15, 'Galleta Lotus': 0.22, 'Oreo triturada': 0.14, 'Brownie': 0.18,
  'Galleta María': 0.08, 'Coco rallado': 0.12, 'Almendra fileteada': 0.28, 'Nuez picada': 0.3,
  'Granola proteica': 0.18, 'Chía': 0.15, 'Amaranto inflado': 0.1, 'Pistache': 0.45,
  'Cacao nibs': 0.3, 'Semillas de calabaza': 0.18, 'Linaza molida': 0.08, 'Tahini': 0.2,
  'Proteína natural': 0.6,
}

export async function hasDemoOrActivity(): Promise<boolean> {
  return (await db.sales.count()) > 0
}

/**
 * Puebla 14 días de operación plausible: compras iniciales (fijan costos
 * reales por promedio ponderado), ventas con toppings, gastos y cortes de
 * caja diarios. Solo se permite sobre una base sin ventas. No sube nada a
 * la nube: la cola de sincronización queda limpia.
 */
export async function loadDemoData() {
  if (await hasDemoOrActivity()) throw new Error('Ya hay ventas registradas')
  const rand = rng(20260706)
  const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]

  await db.transaction('rw', db.tables, async () => {
    const products = await db.products.toArray()
    const ingredients = await db.ingredients.toArray()

    // empleadas de ejemplo si no hay
    if ((await db.employees.count()) === 0) {
      const emps: Employee[] = [
        { id: uid(), name: 'Tania', pin: '1111', active: true },
        { id: uid(), name: 'Majo', pin: '2222', active: true },
      ]
      await db.employees.bulkAdd(emps)
      await db.meta.put({ key: 'activeEmployeeId', value: emps[0].id })
    }
    const employees = await db.employees.toArray()

    // compras iniciales hace 14 días: fijan costo y stock de arranque
    const t0 = startOfDay(13)
    for (const ing of ingredients) {
      const cost = DEMO_COSTS[ing.name] ?? 0.1
      const qty = ing.unit === 'pza' ? 300 : 20000
      ing.cost = cost
      ing.stock = qty
      await db.ingredients.update(ing.id, { cost, stock: qty })
      await db.purchases.add({
        id: uid(), ts: t0 - 3600_000, ingredientId: ing.id, ingredientName: ing.name,
        qty, totalCost: round2(qty * cost), note: 'Compra inicial (demo)',
      })
    }
    const ingMap = new Map(ingredients.map(i => [i.id, i]))
    const consume = (id: string, qty: number) => {
      const ing = ingMap.get(id)
      if (ing) ing.stock = round2(ing.stock - qty)
    }

    const vasos = products.filter(p => p.toppingGroup)
    const otros = products.filter(p => !p.toppingGroup)
    const payments: Payment[] = ['efectivo', 'efectivo', 'efectivo', 'tarjeta', 'tarjeta', 'transferencia']

    for (let day = 13; day >= 0; day--) {
      const open = startOfDay(day) + 11 * 3600_000
      const weekend = [0, 6].includes(new Date(open).getDay())
      const nSales = Math.floor((weekend ? 16 : 9) + rand() * (weekend ? 12 : 8))
      const emp = employees[day % employees.length]
      const sessionId = uid()
      let cashTotal = 0

      for (let s = 0; s < nSales; s++) {
        const ts = open + (s / nSales) * 8 * 3600_000 + rand() * 1200_000
        const items: SaleItem[] = []
        const addItem = (p: Product, toppings: Ingredient[]) => {
          const extra = Math.max(0, toppings.length - INCLUDED_TOPPINGS)
          const tCost = toppings.reduce((sum, t) => sum + t.cost * (t.portion ?? 0), 0)
          items.push({
            productId: p.id, name: p.name, qty: 1,
            price: round2(p.price + extra * EXTRA_TOPPING_PRICE),
            cost: round2(productCost(p, ingMap) + tCost),
            toppings: toppings.length ? toppings.map(t => t.name) : undefined,
          })
          for (const r of p.recipe) consume(r.ingredientId, r.qty)
          for (const t of toppings) consume(t.id, t.portion ?? 0)
        }

        const vaso = pick(vasos)
        const group = vaso.toppingGroup!
        const elegibles = ingredients.filter(i => (i.toppingGroups ?? []).includes(group))
        const nTop = rand() < 0.25 ? 3 : 2
        const chosen: Ingredient[] = []
        while (chosen.length < nTop) {
          const t = pick(elegibles)
          if (!chosen.includes(t)) chosen.push(t)
        }
        addItem(vaso, chosen)
        if (rand() < 0.3) addItem(pick(otros), [])

        const payment = pick(payments)
        const total = round2(items.reduce((x, i) => x + i.price * i.qty, 0))
        if (payment === 'efectivo') cashTotal += total
        const sale: Sale = {
          id: uid(), ts, items, total,
          cost: round2(items.reduce((x, i) => x + i.cost * i.qty, 0)),
          payment, sessionId, employeeName: emp?.name,
        }
        await db.sales.add(sale)
      }

      // gasto ocasional del turno
      let spent = 0
      if (rand() < 0.6) {
        const amount = round2(25 + rand() * 60)
        spent = amount
        const e: Expense = { id: uid(), ts: open + 2 * 3600_000, concept: pick(['Hielo', 'Bolsas', 'Servilletas', 'Gasolina reparto']), amount, sessionId }
        await db.expenses.add(e)
      }

      const expected = round2(500 + cashTotal - spent)
      const diff = rand() < 0.75 ? 0 : round2((rand() - 0.5) * 40)
      await db.cashSessions.add({
        id: sessionId, openTs: open, closeTs: open + 9 * 3600_000,
        openAmount: 500, expected, closeAmount: round2(expected + diff), employeeName: emp?.name,
      })
    }

    // persiste los stocks consumidos y deja fuera de la cola de subida
    for (const ing of ingMap.values()) await db.ingredients.update(ing.id, { stock: ing.stock })
    await db.outbox.clear()
    await db.meta.put({ key: 'demoData', value: '1' })
  })
}
