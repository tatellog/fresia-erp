import 'fake-indexeddb/auto'
import { beforeAll, describe, expect, it } from 'vitest'
import { db } from '../data/db'
import { uid } from '../data/ids'
import type { CashSession, Sale } from '../data/types'
import { addExpense, closeCash, expectedCash, openCash } from '../services/cash'

const sale = (total: number, payment: Sale['payment'], sessionId: string): Sale =>
  ({ id: uid(), ts: Date.now(), items: [], total, cost: 0, payment, sessionId })

let session: CashSession

beforeAll(async () => {
  await db.open()
  await openCash(500)
  session = (await db.cashSessions.toArray())[0]
})

describe('caja: dinero del día', () => {
  it('el efectivo esperado es fondo + ventas efectivo − gastos − retiros', async () => {
    const ventas = [
      sale(109, 'efectivo', session.id),
      sale(155, 'tarjeta', session.id),      // no cuenta para efectivo
      sale(89, 'efectivo', session.id),
      sale(125, 'transferencia', session.id), // tampoco
      sale(119, 'rappi', session.id),         // delivery: la app cobra, no entra a caja
      sale(139, 'uber', session.id),
    ]
    await addExpense('Hielo', 120, session.id)             // gasto
    await addExpense('Depósito al banco', 100, session.id, 'retiro')
    const expenses = await db.expenses.toArray()
    expect(expectedCash(session, ventas, expenses)).toBe(500 + 109 + 89 - 120 - 100)
  })

  it('gastos y retiros se distinguen por tipo', async () => {
    const expenses = await db.expenses.toArray()
    expect(expenses.filter(e => (e.kind ?? 'gasto') === 'gasto').map(e => e.concept)).toEqual(['Hielo'])
    expect(expenses.filter(e => e.kind === 'retiro').map(e => e.concept)).toEqual(['Depósito al banco'])
  })

  it('el corte guarda contado, esperado y la justificación de la diferencia', async () => {
    await closeCash(session, 458, 478, 'Cambio de más en una venta')
    const closed = await db.cashSessions.get(session.id)
    expect(closed?.closeAmount).toBe(458)
    expect(closed?.expected).toBe(478)
    expect(closed?.note).toBe('Cambio de más en una venta')
    expect(closed?.closeTs).toBeTypeOf('number')
  })
})
