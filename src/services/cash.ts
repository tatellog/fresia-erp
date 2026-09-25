import { db } from '../data/db'
import { uid } from '../data/ids'
import type { CashSession, Expense, ExpenseKind, ExpensePayment, Sale } from '../data/types'
import { round2 } from '../lib/format'
import { enqueue } from './outbox'

/**
 * La caja abierta: la sesión sin cierre que se abrió más recientemente.
 * Con la bajada desde la nube pueden llegar sesiones viejas que nadie
 * cerró en otro dispositivo; la vigente es siempre la última en abrirse.
 */
export async function openCashSession(): Promise<CashSession | undefined> {
  return db.cashSessions.orderBy('openTs').reverse().filter(s => s.closeTs === undefined).first()
}

/** salida de dinero pagada con efectivo de la caja (las de tarjeta o transferencia no tocan el cajón) */
export const paidInCash = (e: Expense) => (e.payment ?? 'efectivo') === 'efectivo'

/**
 * Efectivo que debería haber en caja: fondo + ventas en efectivo − gastos
 * en efectivo − retiros. Las propinas no entran: son del equipo y se
 * apartan al momento.
 */
export function expectedCash(session: CashSession, sales: Sale[], expenses: Expense[]): number {
  const cashSales = sales.filter(s => s.payment === 'efectivo').reduce((s, x) => s + x.total, 0)
  const out = expenses.filter(paidInCash).reduce((s, x) => s + x.amount, 0)
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
export async function addExpense(concept: string, amount: number, sessionId?: string, kind: ExpenseKind = 'gasto', payment: ExpensePayment = 'efectivo') {
  return db.transaction('rw', [db.expenses, db.outbox], async () => {
    const row: Expense = { id: uid(), ts: Date.now(), concept, amount, sessionId, kind, payment }
    await db.expenses.add(row)
    await enqueue('expenses', 'upsert', row)
  })
}
