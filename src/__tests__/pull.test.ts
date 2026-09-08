import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '../data/db'
import { mergeIntoLocal } from '../services/sync/pull'

const venta = (id: string, total: number) => ({ id, ts: 1700000000000, items: [], total, cost: 0, payment: 'efectivo' as const })

beforeEach(async () => {
  await db.open()
  await db.sales.clear()
  await db.employees.clear()
  await db.outbox.clear()
})

describe('bajada desde la nube', () => {
  it('agrega lo nuevo, actualiza lo que cambió y quita lo borrado', async () => {
    await db.sales.bulkAdd([venta('a', 100), venta('c', 50)])
    await mergeIntoLocal({ sales: [venta('a', 120), venta('b', 80)] }, [{ table: 'sales', id: 'c' }])
    const ids = (await db.sales.toArray()).map(s => [s.id, s.total]).sort()
    expect(ids).toEqual([['a', 120], ['b', 80]])
  })

  it('respeta los cambios locales que aún no se han subido', async () => {
    await db.sales.bulkAdd([venta('a', 100), venta('c', 50)])
    await db.outbox.add({ table: 'sales', op: 'upsert', row: { id: 'a' }, ts: 1 } as never)
    await db.outbox.add({ table: 'sales', op: 'upsert', row: { id: 'c' }, ts: 2 } as never)
    await mergeIntoLocal({ sales: [venta('a', 999)] }, [{ table: 'sales', id: 'c' }])
    expect((await db.sales.get('a'))?.total).toBe(100)
    expect(await db.sales.get('c')).toBeDefined()
  })

  it('conserva el PIN local del personal', async () => {
    await db.employees.add({ id: 'e1', name: 'Ana', pin: '1234', active: true })
    await mergeIntoLocal({ employees: [{ id: 'e1', name: 'Ana María', active: true, pin: '' }, { id: 'e2', name: 'Luz', active: true, pin: '' }] }, [])
    expect(await db.employees.get('e1')).toMatchObject({ name: 'Ana María', pin: '1234' })
    expect((await db.employees.get('e2'))?.pin).toBe('')
  })
})
