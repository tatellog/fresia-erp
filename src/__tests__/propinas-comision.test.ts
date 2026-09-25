import 'fake-indexeddb/auto'
import { beforeAll, describe, expect, it } from 'vitest'
import { db } from '../data/db'
import { uid } from '../data/ids'
import type { CashSession, Product, Sale } from '../data/types'
import { addExpense, expectedCash, openCash } from '../services/cash'
import { CARD_FEE_RATE, cardFee, feeFor, saleNet } from '../services/fees'
import { profit } from '../services/analytics'
import { checkout, setSalePayment } from '../services/sales'
import { registerPurchase } from '../services/inventory'
import { toCloud } from '../services/sync/mapping'
import { fromCloud } from '../services/sync/restore'

const vaso: Product = { id: 'p-clasica', name: 'Clásica · Mediano', emoji: '', price: 100, recipe: [], active: true, sort: 1 }
const sale = (total: number, payment: Sale['payment'], sessionId: string, extra: Partial<Sale> = {}): Sale =>
  ({ id: uid(), ts: Date.now(), items: [], total, cost: 0, payment, sessionId, ...extra })

let session: CashSession

beforeAll(async () => {
  await db.open()
  await openCash(500)
  session = (await db.cashSessions.toArray())[0]
})

describe('comisión de tarjeta de Mercado Pago', () => {
  it('es 3.5 % más IVA: 4.06 % del monto cobrado', () => {
    expect(CARD_FEE_RATE).toBeCloseTo(0.035 * 1.16, 6)
    expect(cardFee(1000)).toBe(40.6)
    expect(cardFee(500)).toBe(20.3)
  })

  it('solo aplica a tarjeta y se calcula sobre venta más propina', () => {
    expect(feeFor('tarjeta', 100)).toBe(4.06)
    expect(feeFor('tarjeta', 100, 15)).toBe(4.67)
    expect(feeFor('efectivo', 100, 15)).toBe(0)
    expect(feeFor('transferencia', 100)).toBe(0)
    expect(feeFor('rappi', 100)).toBe(0)
  })

  it('la venta con tarjeta guarda su comisión y la ganancia la descuenta', async () => {
    const id = await checkout([{ product: vaso, qty: 2, toppings: [], extras: [] }], 'tarjeta')
    const s = (await db.sales.get(id))!
    expect(s.total).toBe(200)
    expect(s.fee).toBe(8.12)
    expect(s.tip).toBeUndefined()
    expect(saleNet(s)).toBe(191.88)
    expect(profit([s])).toEqual({ income: 200, cost: 0, fees: 8.12, profit: 191.88 })
  })

  it('al corregir el método de cobro se recalcula la comisión', async () => {
    const id = await checkout([{ product: vaso, qty: 1, toppings: [], extras: [] }], 'efectivo')
    expect((await db.sales.get(id))!.fee).toBeUndefined()
    await setSalePayment(id, 'tarjeta')
    expect((await db.sales.get(id))!.fee).toBe(4.06)
    await setSalePayment(id, 'transferencia')
    expect((await db.sales.get(id))!.fee).toBeUndefined()
  })
})

describe('propina', () => {
  it('va aparte del total de la venta y no entra al efectivo esperado', async () => {
    const id = await checkout([{ product: vaso, qty: 1, toppings: [], extras: [] }], 'efectivo', 15)
    const s = (await db.sales.get(id))!
    expect(s.total).toBe(100)
    expect(s.tip).toBe(15)
    expect(expectedCash(session, [s], [])).toBe(500 + 100)
  })

  it('con tarjeta la comisión se cobra también sobre la propina', async () => {
    const id = await checkout([{ product: vaso, qty: 1, toppings: [], extras: [] }], 'tarjeta', 10)
    const s = (await db.sales.get(id))!
    expect(s.tip).toBe(10)
    expect(s.fee).toBe(4.47)
    expect(saleNet(s)).toBe(105.53)
  })

  it('viaja a la nube y regresa igual', () => {
    const local = sale(100, 'tarjeta', session.id, { tip: 10, fee: 4.47 })
    const nube = toCloud.sales.map(local as unknown as Record<string, unknown>, 'Principal')
    expect(nube).toMatchObject({ tip: 10, fee: 4.47 })
    expect(fromCloud.sales({ ...nube, ts: new Date(local.ts).toISOString() })).toMatchObject({ tip: 10, fee: 4.47 })
    const sinPropina = toCloud.sales.map(sale(100, 'efectivo', session.id) as unknown as Record<string, unknown>, 'Principal')
    expect(sinPropina).toMatchObject({ tip: 0, fee: 0 })
    expect(fromCloud.sales({ ...sinPropina, ts: new Date().toISOString() })).toMatchObject({ tip: undefined, fee: undefined })
  })
})

describe('gastos y compras por forma de pago', () => {
  it('solo lo pagado en efectivo baja el efectivo esperado', async () => {
    await db.expenses.clear()
    await addExpense('Hielo', 50, session.id, 'gasto', 'efectivo')
    await addExpense('Gasolina', 300, session.id, 'gasto', 'tarjeta')
    await addExpense('Bolsas', 80, session.id, 'gasto', 'transferencia')
    const expenses = await db.expenses.toArray()
    expect(expectedCash(session, [], expenses)).toBe(500 - 50)
  })

  it('la compra de insumos con tarjeta queda como gasto del turno sin tocar el cajón', async () => {
    await db.expenses.clear()
    await db.ingredients.put({ id: 'i-crema', name: 'Crema', unit: 'ml', stock: 0, cost: 0, minStock: 0 })
    await registerPurchase('i-crema', 1000, 180, undefined, session.id, 'tarjeta')
    const compra = (await db.expenses.toArray()).find(e => e.concept === 'Compra · Crema')!
    expect(compra).toMatchObject({ amount: 180, kind: 'gasto', payment: 'tarjeta', sessionId: session.id })
    expect((await db.ingredients.get('i-crema'))!.stock).toBe(1000)
    expect(expectedCash(session, [], [compra])).toBe(500)
    expect(toCloud.expenses.map(compra as unknown as Record<string, unknown>, 'Principal')).toMatchObject({ payment: 'tarjeta' })
  })

  it('los gastos viejos sin forma de pago cuentan como efectivo', () => {
    const viejo = { id: uid(), ts: Date.now(), concept: 'Hielo', amount: 40, sessionId: session.id }
    expect(expectedCash(session, [], [viejo])).toBe(460)
    expect(fromCloud.expenses({ id: viejo.id, ts: new Date().toISOString(), concept: 'Hielo', amount: 40, kind: 'gasto', payment: null })).toMatchObject({ payment: 'efectivo' })
  })
})
