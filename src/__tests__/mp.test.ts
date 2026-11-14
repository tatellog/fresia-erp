import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../data/db'
import { chargeOnTerminal, mensajeDeAyuda, watchPrint } from '../services/mp'

// la Edge Function se sustituye por un doble: aquí se prueba la lógica de
// reintento, no la red (vi.mock se iza, por eso el espía va en vi.hoisted)
const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }))
vi.mock('../services/sync/client', () => ({
  cloudEnabled: true,
  supabase: { functions: { invoke } },
}))

describe('mensajes de la terminal Mercado Pago', () => {
  it('la terminal ocupada explica cómo destrabarla', () => {
    const m = mensajeDeAyuda('There is already a queued order on the terminal.')
    expect(m).toMatch(/trabajo pendiente/)
    // las dos salidas reales: resolverlo en la Point, o cobrar ahí y registrar
    expect(m).toMatch(/cancélalo ahí/)
    expect(m).toMatch(/Ya se cobró en la Point/)
  })

  it('el modo equivocado manda a activar PDV', () => {
    expect(mensajeDeAyuda('Terminal operating mode is STANDALONE')).toMatch(/modo PDV/)
  })

  it('las credenciales vencidas señalan el token', () => {
    expect(mensajeDeAyuda('unauthorized')).toMatch(/MP_ACCESS_TOKEN/)
  })

  it('el monto rechazado manda a cobrar directo en la Point', () => {
    expect(mensajeDeAyuda('Invalid value for property')).toMatch(/directo en la Point/)
  })

  it('un mensaje desconocido se deja tal cual', () => {
    expect(mensajeDeAyuda('Amount must be greater than zero')).toBe('Amount must be greater than zero')
  })
})

describe('cobro con la cola trabada', () => {
  const encolada = {
    data: null,
    error: { context: { json: async () => ({ error: 'There is already a queued order on the terminal.' }) } },
  }

  beforeEach(async () => {
    invoke.mockReset()
    await db.meta.put({ key: 'mpTerminalId', value: 'TERM-1' })
    await db.meta.put({ key: 'mpPendingPrint', value: 'accion-atorada' })
    await db.meta.delete('mpPendingOrder')
  })

  const enPdv = { data: { terminals: [{ id: 'TERM-1', operating_mode: 'PDV' }] }, error: null }

  it('saca de la cola el ticket que nadie recogió y vuelve a cobrar', async () => {
    invoke
      .mockResolvedValueOnce(enPdv)                                     // la Point está en PDV
      .mockResolvedValueOnce(encolada)                                  // el cobro rebota
      .mockResolvedValueOnce({ data: { status: 'canceled' }, error: null }) // se cancela la impresión
      .mockResolvedValueOnce({ data: { order_id: 'ord-1' }, error: null })  // y el cobro entra

    expect(await chargeOnTerminal(120, 'venta-1')).toBe('ord-1')
    expect(invoke.mock.calls[2][1].body).toMatchObject({ action: 'cancel_action', action_id: 'accion-atorada' })
    expect(await db.meta.get('mpPendingPrint')).toBeUndefined()
  })

  it('sin impresión pendiente el error se propaga tal cual', async () => {
    await db.meta.delete('mpPendingPrint')
    invoke.mockResolvedValueOnce(enPdv).mockResolvedValueOnce(encolada)
    await expect(chargeOnTerminal(120, 'venta-1')).rejects.toThrow(/trabajo pendiente/)
    expect(invoke).toHaveBeenCalledTimes(2)
  })

  it('cancela el cobro que se quedó esperando y vuelve a cobrar', async () => {
    await db.meta.delete('mpPendingPrint')
    await db.meta.put({ key: 'mpPendingOrder', value: 'ord-atorada' })
    invoke
      .mockResolvedValueOnce(enPdv)
      .mockResolvedValueOnce(encolada)
      .mockResolvedValueOnce({ data: { status: 'canceled' }, error: null })
      .mockResolvedValueOnce({ data: { order_id: 'ord-2' }, error: null })

    expect(await chargeOnTerminal(120, 'venta-2')).toBe('ord-2')
    expect(invoke.mock.calls[2][1].body).toMatchObject({ action: 'cancel', order_id: 'ord-atorada' })
    expect((await db.meta.get('mpPendingOrder'))?.value).toBe('ord-2')
  })

  it('con la Point en modo normal no manda el cobro y explica qué hacer', async () => {
    invoke.mockResolvedValueOnce({ data: { terminals: [{ id: 'TERM-1', operating_mode: 'STANDALONE' }] }, error: null })
    await expect(chargeOnTerminal(120, 'venta-1')).rejects.toThrow(/modo normal.*Ya se cobró en la Point/)
    expect(invoke).toHaveBeenCalledTimes(1)
  })
})

describe('vigilancia del ticket enviado a la Point', () => {
  beforeEach(async () => {
    invoke.mockReset()
    await db.meta.put({ key: 'mpTerminalId', value: 'TERM-1' })
    await db.meta.put({ key: 'mpPendingPrint', value: 'accion-1' })
  })

  it('retira el ticket que la Point nunca recogió', async () => {
    // la Point nunca lo toma: todos los sondeos siguen en «created»
    invoke.mockResolvedValue({ data: { status: 'created' }, error: null })

    expect(await watchPrint('accion-1', 60, 10)).toBe('canceled')
    expect(invoke.mock.calls.at(-1)?.[1].body).toMatchObject({ action: 'cancel_action', action_id: 'accion-1' })
    expect(await db.meta.get('mpPendingPrint')).toBeUndefined()
  })

  it('deja en paz el ticket que sí llegó a la terminal', async () => {
    invoke.mockResolvedValueOnce({ data: { status: 'on_terminal' }, error: null })

    expect(await watchPrint('accion-1', 60, 10)).toBe('on_terminal')
    expect(invoke).toHaveBeenCalledTimes(1)
    expect(await db.meta.get('mpPendingPrint')).toBeUndefined()
  })
})
