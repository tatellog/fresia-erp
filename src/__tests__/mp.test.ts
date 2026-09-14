import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '../data/db'
import { chargeOnTerminal, mensajeDeAyuda } from '../services/mp'

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
    // las dos salidas reales: que la Point lo recoja, o sacarlo de la cola
    expect(m).toMatch(/Cobros vinculados/)
    expect(m).toMatch(/Destrabar terminal/)
  })

  it('el modo equivocado manda a activar PDV', () => {
    expect(mensajeDeAyuda('Terminal operating mode is STANDALONE')).toMatch(/modo PDV/)
  })

  it('las credenciales vencidas señalan el token', () => {
    expect(mensajeDeAyuda('unauthorized')).toMatch(/MP_ACCESS_TOKEN/)
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
  })

  it('saca de la cola el ticket que nadie recogió y vuelve a cobrar', async () => {
    invoke
      .mockResolvedValueOnce(encolada)                                  // el cobro rebota
      .mockResolvedValueOnce({ data: { status: 'canceled' }, error: null }) // se cancela la impresión
      .mockResolvedValueOnce({ data: { order_id: 'ord-1' }, error: null })  // y el cobro entra

    expect(await chargeOnTerminal(120, 'venta-1')).toBe('ord-1')
    expect(invoke.mock.calls[1][1].body).toMatchObject({ action: 'cancel_action', action_id: 'accion-atorada' })
    expect(await db.meta.get('mpPendingPrint')).toBeUndefined()
  })

  it('sin impresión pendiente el error se propaga tal cual', async () => {
    await db.meta.delete('mpPendingPrint')
    invoke.mockResolvedValueOnce(encolada)
    await expect(chargeOnTerminal(120, 'venta-1')).rejects.toThrow(/trabajo pendiente/)
    expect(invoke).toHaveBeenCalledTimes(1)
  })
})
