import 'fake-indexeddb/auto'
import { beforeAll, describe, expect, it } from 'vitest'
import { db } from '../data/db'
import { uid } from '../data/ids'
import { deleteDayRecon, getDayPosTotal, getDayRecon, saveDayRecon, RECON_ID } from '../services/history'

const DIA = new Date('2026-08-12T00:00:00').getTime()

beforeAll(async () => {
  await db.open()
  // venta real del POS ese mismo día: no debe tocarse nunca
  await db.sales.add({
    id: uid(), ts: DIA + 13 * 3600_000, total: 115, cost: 40, payment: 'efectivo',
    items: [{ productId: 'p1', name: 'Clásica · Mediano 16 oz', qty: 1, price: 115, cost: 40 }],
  })
})

describe('captura manual de días pasados', () => {
  it('guarda un registro por forma de pago y se puede releer', async () => {
    await saveDayRecon(DIA, { efectivo: 500, tarjeta: 1200 })
    expect(await getDayRecon(DIA)).toEqual({ efectivo: 500, tarjeta: 1200 })
    const recon = await db.sales.filter(s => s.items[0]?.productId === RECON_ID).toArray()
    expect(recon).toHaveLength(2)
    expect(recon.every(s => s.ts >= DIA && s.ts < DIA + 24 * 3600_000)).toBe(true)
  })

  it('editar reemplaza lo anterior en vez de duplicar', async () => {
    await saveDayRecon(DIA, { efectivo: 650, rappi: 300 })
    expect(await getDayRecon(DIA)).toEqual({ efectivo: 650, rappi: 300 })
    expect(await db.sales.filter(s => s.items[0]?.productId === RECON_ID).count()).toBe(2)
  })

  it('borrar el día elimina lo reconstruido y respeta las ventas del POS', async () => {
    await deleteDayRecon(DIA)
    expect(await getDayRecon(DIA)).toEqual({})
    expect(await getDayPosTotal(DIA)).toBe(115)
    expect(await db.sales.count()).toBe(1)
  })
})
