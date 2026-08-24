import { db } from '../data/db'
import { uid } from '../data/ids'
import type { Payment, Sale } from '../data/types'
import { round2 } from '../lib/format'
import { enqueue } from './outbox'

/**
 * Captura manual de días pasados: un registro de venta por forma de pago,
 * marcado como reconstruido para no confundirse con las ventas del POS.
 * Sirve para vaciar los cortes en papel de antes de usar la app.
 */

/** marca en items[].productId que identifica una venta reconstruida a mano */
export const RECON_ID = 'corte-papel'
export const RECON_NAME = 'Venta reconstruida (corte en papel)'

/** ticket promedio usado solo para estimar vasos del día reconstruido */
const AVG_TICKET = 115

/** hora local en que se fecha cada método, para repartirlos en el día */
const RECON_HOUR: Record<Payment, number> = { efectivo: 16, tarjeta: 18, transferencia: 19, rappi: 19, uber: 19 }

export type DayAmounts = Partial<Record<Payment, number>>

const dayRange = (dayStart: number) => [dayStart, dayStart + 24 * 3600_000] as const

const isRecon = (s: Sale) => s.items[0]?.productId === RECON_ID

/** ventas reconstruidas de ese día, como monto por forma de pago */
export async function getDayRecon(dayStart: number): Promise<DayAmounts> {
  const [from, to] = dayRange(dayStart)
  const sales = await db.sales.where('ts').between(from, to).filter(isRecon).toArray()
  const out: DayAmounts = {}
  for (const s of sales) out[s.payment] = round2((out[s.payment] ?? 0) + s.total)
  return out
}

/** total de ventas reales del POS ese día (para avisar que se suman aparte) */
export async function getDayPosTotal(dayStart: number): Promise<number> {
  const [from, to] = dayRange(dayStart)
  const sales = await db.sales.where('ts').between(from, to).filter(s => !isRecon(s)).toArray()
  return round2(sales.reduce((sum, s) => sum + s.total, 0))
}

/**
 * Guarda el día reconstruido: reemplaza lo reconstruido previo de ese día
 * por un registro por cada forma de pago con monto mayor a cero.
 * Las ventas reales del POS de ese día no se tocan.
 */
export async function saveDayRecon(dayStart: number, amounts: DayAmounts) {
  const [from, to] = dayRange(dayStart)
  await db.transaction('rw', [db.sales, db.outbox], async () => {
    const previas = await db.sales.where('ts').between(from, to).filter(isRecon).toArray()
    for (const s of previas) {
      await db.sales.delete(s.id)
      await enqueue('sales', 'delete', { id: s.id })
    }
    for (const [payment, amount] of Object.entries(amounts) as [Payment, number][]) {
      if (!(amount > 0)) continue
      const ts = dayStart + RECON_HOUR[payment] * 3600_000 + 30 * 60_000
      const qty = Math.max(1, Math.round(amount / AVG_TICKET))
      const sale: Sale = {
        id: uid(), ts, total: round2(amount), cost: 0, payment,
        items: [{ productId: RECON_ID, name: RECON_NAME, qty, price: round2(amount / qty), cost: 0 }],
      }
      await db.sales.add(sale)
      await enqueue('sales', 'upsert', sale)
    }
  })
}

/** borra todo lo reconstruido de ese día (las ventas del POS quedan intactas) */
export const deleteDayRecon = (dayStart: number) => saveDayRecon(dayStart, {})
