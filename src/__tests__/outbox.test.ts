import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'

/** la nube simulada: `fallar` decide qué tabla rebota */
const fallar = new Set<string>()
const upserts: string[] = []

vi.mock('../services/sync/client', () => ({
  cloudEnabled: true,
  supabase: {
    auth: { getSession: async () => ({ data: { session: { user: { id: 'u1' } } } }) },
    from: (table: string) => ({
      upsert: async () => {
        upserts.push(table)
        return fallar.has(table)
          ? { error: { message: `Could not find the 'free_premium' column of '${table}'` } }
          : { error: null }
      },
      delete: () => ({ in: async () => ({ error: fallar.has(table) ? { message: 'no se pudo borrar' } : null }) }),
    }),
  },
}))

const { db } = await import('../data/db')
const { flushOutbox } = await import('../services/sync/engine')

/** el motor solo sube si el dispositivo se ve en línea */
Object.defineProperty(globalThis.navigator, 'onLine', { value: true, configurable: true })

const encolar = (table: string, id: string) =>
  db.outbox.add({ table, op: 'upsert', row: { id, name: id }, ts: Date.now() } as never)

beforeEach(async () => {
  await db.open()
  await db.outbox.clear()
  fallar.clear()
  upserts.length = 0
})

describe('cola de sincronización', () => {
  it('sube todo cuando la nube responde bien', async () => {
    await encolar('products', 'p1')
    await encolar('sales', 's1')
    const r = await flushOutbox()
    expect(r).toMatchObject({ pushed: 2 })
    expect(r.error).toBeUndefined()
    expect(await db.outbox.count()).toBe(0)
  })

  it('una tabla que rebota no frena a las ventas y se reintenta después', async () => {
    fallar.add('products')
    await encolar('products', 'p1')
    await encolar('sales', 's1')
    await encolar('products', 'p2')
    await encolar('sales', 's2')

    const r = await flushOutbox()
    // las dos ventas suben aunque los productos reboten
    expect(r.pushed).toBe(2)
    expect(r.error).toMatch(/products/)
    const quedan = await db.outbox.toArray()
    expect(quedan.map(e => e.row.id)).toEqual(['p1', 'p2'])
    // la tabla atorada se intenta una sola vez por vuelta, no en bucle
    expect(upserts.filter(t => t === 'products')).toHaveLength(1)

    // arreglada la nube (columna agregada), el siguiente intento los sube
    fallar.clear()
    const r2 = await flushOutbox()
    expect(r2).toMatchObject({ pushed: 2 })
    expect(await db.outbox.count()).toBe(0)
  })
})
