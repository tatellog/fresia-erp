import { db } from '../data/db'
import { supabase } from './sync/client'

/**
 * Cobro en terminal Mercado Pago Point (Point Smart 2 en modo PDV).
 * Las llamadas pasan por la Edge Function `mp` de Supabase, que guarda el
 * access token; requiere sesión de nube iniciada e internet.
 */

export interface MpTerminal {
  id: string
  operating_mode: 'PDV' | 'STANDALONE'
  external_pos_id?: string
}

/** resultado final de una orden en la terminal */
export type TerminalOutcome = 'paid' | 'canceled' | 'expired' | 'failed'

async function call<T = Record<string, unknown>>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('mp', { body })
  if (error) {
    // en respuestas no-2xx el detalle viene en el cuerpo (error.context es la Response)
    const detail = await (error as { context?: Response }).context?.json?.().catch(() => null)
    throw new Error((detail as { error?: string })?.error ?? 'No se pudo contactar la función de Mercado Pago')
  }
  if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error)
  return data as T
}

export const listTerminals = async () => (await call<{ terminals: MpTerminal[] }>({ action: 'terminals' })).terminals

export const setTerminalMode = (id: string, mode: 'PDV' | 'STANDALONE') =>
  call({ action: 'mode', terminal_id: id, mode })

/** terminal vinculada a este dispositivo (elegida en Ajustes) */
export const getLinkedTerminal = async () => (await db.meta.get('mpTerminalId'))?.value || null

export const linkTerminal = (id: string) => db.meta.put({ key: 'mpTerminalId', value: id })
export const unlinkTerminal = () => db.meta.delete('mpTerminalId')

/** manda el cobro a la terminal; devuelve el id de la orden */
export async function chargeOnTerminal(amount: number, reference: string): Promise<string> {
  const terminalId = await getLinkedTerminal()
  if (!terminalId) throw new Error('No hay terminal vinculada (Ajustes → Terminal Mercado Pago)')
  const r = await call<{ order_id: string }>({
    action: 'charge',
    amount,
    terminal_id: terminalId,
    reference: reference.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64),
  })
  return r.order_id
}

export const cancelTerminalOrder = (orderId: string) => call({ action: 'cancel', order_id: orderId })

/** manda a imprimir el ticket de venta (imagen PNG en base64); devuelve el id de la acción */
export async function printTicket(contentBase64: string, reference: string): Promise<string> {
  const terminalId = await getLinkedTerminal()
  if (!terminalId) throw new Error('No hay terminal vinculada (Ajustes → Terminal Mercado Pago)')
  const r = await call<{ action_id: string }>({
    action: 'print',
    terminal_id: terminalId,
    content: contentBase64,
    reference: reference.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64),
  })
  return r.action_id
}

/** estado de una impresión enviada (created / processed / failed…) */
export const printStatus = (actionId: string) =>
  call<{ status: string; detail: string | null }>({ action: 'action_status', action_id: actionId })

/**
 * Espera el resultado del pago consultando la orden cada 2.5 s hasta que
 * termina o pasan ~5.5 min (la orden expira sola a los 5).
 */
export async function waitForPayment(orderId: string, opts?: { signal?: AbortSignal }): Promise<TerminalOutcome> {
  const deadline = Date.now() + 5.5 * 60_000
  while (Date.now() < deadline) {
    if (opts?.signal?.aborted) return 'canceled'
    await new Promise(r => setTimeout(r, 2500))
    try {
      const { status } = await call<{ status: string }>({ action: 'status', order_id: orderId })
      if (status === 'processed') return 'paid'
      if (status === 'canceled') return 'canceled'
      if (status === 'expired') return 'expired'
      if (status === 'failed' || status === 'refunded') return 'failed'
    } catch {
      // red intermitente: se vuelve a intentar en el siguiente ciclo
    }
  }
  return 'expired'
}
