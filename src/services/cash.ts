import { db } from '../data/db'
import { uid } from '../data/ids'
import type { CashSession, Expense, ExpenseKind, Sale } from '../data/types'
import { round2 } from '../lib/format'
import { enqueue } from './outbox'

/** efectivo que debería haber en caja: fondo + ventas en efectivo − gastos − retiros */
export function expectedCash(session: CashSession, sales: Sale[], expenses: Expense[]): number {
  const cashSales = sales.filter(s => s.payment === 'efectivo').reduce((s, x) => s + x.total, 0)
  const out = expenses.reduce((s, x) => s + x.amount, 0)
  return round2(session.openAmount + cashSales - out)
}

export async function openCash(openAmount: number) {
  return db.transaction('rw', [db.cashSessions, db.outbox, db.meta, db.employees], async () => {
    const activeId = (await db.meta.get('activeEmployeeId'))?.value
    const employee = activeId ? await db.employees.get(activeId) : undefined
    const row: CashSession = { id: uid(), openTs: Date.now(), openAmount, employeeName: employee?.name }
    await db.cashSessions.add(row)
    await enqueue('cashSessions', 'upsert', row)
  })
}

export async function closeCash(session: CashSession, closeAmount: number, expected: number, note?: string) {
  return db.transaction('rw', [db.cashSessions, db.outbox], async () => {
    const row = { ...session, closeTs: Date.now(), closeAmount, expected, note: note?.trim() || undefined }
    await db.cashSessions.put(row)
    await enqueue('cashSessions', 'upsert', row)
  })
}

/** registra una salida de dinero del turno: gasto operativo o retiro de efectivo */
export async function addExpense(concept: string, amount: number, sessionId?: string, kind: ExpenseKind = 'gasto') {
  return db.transaction('rw', [db.expenses, db.outbox], async () => {
    const row: Expense = { id: uid(), ts: Date.now(), concept, amount, sessionId, kind }
    await db.expenses.add(row)
    await enqueue('expenses', 'upsert', row)
  })
}
