import { db } from '../data/db'
import { uid } from '../data/ids'
import type { CashSession, Expense } from '../data/types'
import { enqueue } from './outbox'

export async function openCash(openAmount: number) {
  return db.transaction('rw', [db.cashSessions, db.outbox], async () => {
    const row: CashSession = { id: uid(), openTs: Date.now(), openAmount }
    await db.cashSessions.add(row)
    await enqueue('cashSessions', 'upsert', row)
  })
}

export async function closeCash(session: CashSession, closeAmount: number, expected: number) {
  return db.transaction('rw', [db.cashSessions, db.outbox], async () => {
    const row = { ...session, closeTs: Date.now(), closeAmount, expected }
    await db.cashSessions.put(row)
    await enqueue('cashSessions', 'upsert', row)
  })
}

export async function addExpense(concept: string, amount: number, sessionId?: string) {
  return db.transaction('rw', [db.expenses, db.outbox], async () => {
    const row: Expense = { id: uid(), ts: Date.now(), concept, amount, sessionId }
    await db.expenses.add(row)
    await enqueue('expenses', 'upsert', row)
  })
}
