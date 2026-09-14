import 'fake-indexeddb/auto'
import { describe, expect, it } from 'vitest'
import { mensajeDeAyuda } from '../services/mp'

describe('mensajes de la terminal Mercado Pago', () => {
  it('la terminal ocupada explica cómo destrabarla', () => {
    const m = mensajeDeAyuda('There is already a queued order on the terminal.')
    expect(m).toMatch(/trabajo pendiente/)
    expect(m).toMatch(/apágala y vuelve a prenderla/)
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
