import { db } from '../data/db'
import { uid } from '../data/ids'
import type { Investment } from '../data/types'
import { enqueue } from './outbox'

/** nombres de quienes invierten; las iniciales se guardan en cada gasto */
export const INVESTORS: Record<string, string> = { T: 'Tania', A: 'Angel', M: 'Monse' }

/**
 * Cuánto ha aportado cada persona, sobre lo YA PAGADO de cada gasto
 * (monto − resta). Los gastos compartidos se reparten en partes iguales
 * entre sus pagadores; los que no tienen pagador van a la cubeta 'sin'.
 * Invariante: la suma de aportaciones es igual al total pagado.
 */
export function investorShares(investments: Investment[]): Record<string, number> {
  const shares: Record<string, number> = { T: 0, A: 0, M: 0, sin: 0 }
  for (const inv of investments) {
    const paid = inv.amount - inv.pending
    if (paid <= 0) continue
    const payers = inv.paidBy.split('').filter(p => p in INVESTORS)
    if (payers.length === 0) shares.sin += paid
    else for (const p of payers) shares[p] += paid / payers.length
  }
  for (const k of Object.keys(shares)) shares[k] = Math.round(shares[k] * 100) / 100
  return shares
}

export async function saveInvestment(data: Omit<Investment, 'id' | 'ts'>, existing?: Investment) {
  return db.transaction('rw', [db.investments, db.outbox], async () => {
    const row: Investment = existing ? { ...existing, ...data } : { ...data, id: uid(), ts: Date.now() }
    await db.investments.put(row)
    await enqueue('investments', 'upsert', row)
  })
}

export async function deleteInvestment(id: string) {
  return db.transaction('rw', [db.investments, db.outbox], async () => {
    await db.investments.delete(id)
    await enqueue('investments', 'delete', { id })
  })
}

/** gastos de apertura registrados por Tania (julio 2026); se cargan una sola vez por dispositivo */
export const INITIAL_INVESTMENTS: Omit<Investment, 'id' | 'ts'>[] = [
  { concept: 'Renta inicial julio-agosto', amount: 32000, paidBy: 'TMA', pending: 10000 },
  { concept: 'Remodelación anticipo', amount: 27000, paidBy: 'TA', pending: 0 },
  { concept: 'Degustación fresas', amount: 115, paidBy: 'T', pending: 0 },
  { concept: 'Batidora', amount: 2878.40, paidBy: 'A', pending: 0 },
  { concept: 'Espejo', amount: 1500, paidBy: 'T', pending: 0 },
  { concept: 'Refrigerador', amount: 5260, paidBy: 'A', pending: 0 },
  { concept: 'Bancos, repisa y mesa', amount: 3823.29, paidBy: 'A', pending: 0 },
  { concept: 'Pintura', amount: 2482, paidBy: 'A', pending: 0 },
  { concept: 'Insumos', amount: 10000, paidBy: '', pending: 0 },
  { concept: 'Mandiles', amount: 450, paidBy: 'T', pending: 0 },
  { concept: 'Playeras', amount: 1012, paidBy: 'T', pending: 0 },
  { concept: 'Anticipo sillón', amount: 500, paidBy: 'T', pending: 0 },
  { concept: 'Cojines', amount: 240, paidBy: 'T', pending: 0 },
  { concept: 'Sillón', amount: 6500, paidBy: 'A', pending: 0 },
  { concept: 'Leds completos', amount: 5400, paidBy: 'T', pending: 2700 },
  { concept: 'Sueldos julio', amount: 15000, paidBy: '', pending: 0 },
  { concept: 'Tazones blancos y rojos', amount: 2600, paidBy: 'T', pending: 0 },
  { concept: 'Tarja', amount: 1500, paidBy: '', pending: 0 },
  { concept: 'Remodelación completo', amount: 20000, paidBy: '', pending: 0 },
  { concept: 'Luces local', amount: 2800, paidBy: 'A', pending: 0 },
  { concept: 'Cucharas Tania', amount: 0, paidBy: 'T', pending: 0 },
  { concept: 'Cucharas Angel', amount: 366, paidBy: 'A', pending: 0 },
]
