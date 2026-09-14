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

/** la terminal ya tiene algo encolado y Mercado Pago no acepta nada más */
const COLA_OCUPADA = 'La terminal tiene un trabajo pendiente y Mercado Pago no acepta otro hasta que se resuelva. Abre «Cobros vinculados → Cobros automáticos» en la Point para que lo recoja, o usa «Destrabar terminal» en Ajustes para sacarlo de la cola.'

/**
 * Mercado Pago contesta en inglés y sin decir qué hacer. En el mostrador eso
 * no sirve: se traduce a la acción concreta que destraba la terminal.
 */
const AYUDA: [RegExp, string][] = [
  [/already a queued order/i, COLA_OCUPADA],
  [/terminal.*(not found|doesn'?t exist|does not exist)/i,
   'Mercado Pago no encuentra esa terminal. Revisa que siga en tu cuenta y vuelve a vincularla en Ajustes → Terminal Mercado Pago.'],
  [/operating mode|operation mode|standalone/i,
   'La terminal no está en modo PDV. Actívalo en Ajustes → Terminal Mercado Pago y reinicia la Point para que tome el modo.'],
  [/unauthorized|invalid.*token|forbidden/i,
   'Mercado Pago rechazó las credenciales. Hay que renovar el token de la cuenta (secreto MP_ACCESS_TOKEN en Supabase).'],
]

export const mensajeDeAyuda = (msg: string) => AYUDA.find(([re]) => re.test(msg))?.[1] ?? msg

async function call<T = Record<string, unknown>>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke('mp', { body })
  if (error) {
    // en respuestas no-2xx el detalle viene en el cuerpo (error.context es la Response)
    const detail = await (error as { context?: Response }).context?.json?.().catch(() => null)
    const crudo = (detail as { error?: string })?.error
    if (crudo) console.warn('[Frésia] Mercado Pago:', crudo)
    throw new Error(crudo ? mensajeDeAyuda(crudo) : 'No se pudo contactar la función de Mercado Pago')
  }
  if ((data as { error?: string })?.error) {
    const crudo = (data as { error: string }).error
    console.warn('[Frésia] Mercado Pago:', crudo)
    throw new Error(mensajeDeAyuda(crudo))
  }
  return data as T
}

export const listTerminals = async () => (await call<{ terminals: MpTerminal[] }>({ action: 'terminals' })).terminals

export const setTerminalMode = (id: string, mode: 'PDV' | 'STANDALONE') =>
  call({ action: 'mode', terminal_id: id, mode })

/** terminal vinculada a este dispositivo (elegida en Ajustes) */
export const getLinkedTerminal = async () => (await db.meta.get('mpTerminalId'))?.value || null

export const linkTerminal = (id: string) => db.meta.put({ key: 'mpTerminalId', value: id })
export const unlinkTerminal = () => db.meta.delete('mpTerminalId')

/**
 * Manda el cobro a la terminal; devuelve el id de la orden.
 *
 * Una impresión que la Point nunca recogió se queda en la cola para siempre
 * (Mercado Pago no las expira) y a partir de ahí rechaza cualquier cobro. Un
 * ticket que no salió no puede dejar al local sin cobrar con tarjeta: si eso
 * pasa, se saca de la cola y se reintenta.
 */
export async function chargeOnTerminal(amount: number, reference: string): Promise<string> {
  const terminalId = await getLinkedTerminal()
  if (!terminalId) throw new Error('No hay terminal vinculada (Ajustes → Terminal Mercado Pago)')
  const enviar = () => call<{ order_id: string }>({
    action: 'charge',
    amount,
    terminal_id: terminalId,
    reference: reference.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64),
  })
  try {
    return (await enviar()).order_id
  } catch (e) {
    const trabada = e instanceof Error && e.message === COLA_OCUPADA
    if (!trabada || !(await cancelPendingPrint())) throw e
    return (await enviar()).order_id
  }
}

export const cancelTerminalOrder = (orderId: string) => call({ action: 'cancel', order_id: orderId })

/**
 * Manda a imprimir el ticket de venta; devuelve el id de la acción.
 * Va como texto con etiquetas (`custom`): la Point acepta las imágenes y
 * luego no las imprime, así que el ticket se dibuja con caracteres.
 */
export async function printTicket(content: string, reference: string): Promise<string> {
  const terminalId = await getLinkedTerminal()
  if (!terminalId) throw new Error('No hay terminal vinculada (Ajustes → Terminal Mercado Pago)')
  const r = await call<{ action_id: string }>({
    action: 'print',
    terminal_id: terminalId,
    subtype: 'custom',
    content,
    reference: reference.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 64),
  })
  // se recuerda hasta que la Point la recoja: si se queda en la cola, es lo
  // único que Mercado Pago acepta cancelar para volver a cobrar
  await db.meta.put({ key: 'mpPendingPrint', value: r.action_id })
  return r.action_id
}

/** estado de una impresión enviada (created / processed / failed…) */
export const printStatus = (actionId: string) =>
  call<{ status: string; detail: string | null }>({ action: 'action_status', action_id: actionId })

/** impresión que quedó esperando a que la terminal la recogiera */
export const getPendingPrint = async () => (await db.meta.get('mpPendingPrint'))?.value || null

export const clearPendingPrint = () => db.meta.delete('mpPendingPrint')

/** saca una impresión de la cola; Mercado Pago solo deja cancelar las `created` */
export const cancelPrint = (actionId: string) => call({ action: 'cancel_action', action_id: actionId })

/** saca de la cola la impresión atorada que mandó este dispositivo */
export async function cancelPendingPrint(): Promise<boolean> {
  const actionId = await getPendingPrint()
  if (!actionId) return false
  try {
    await cancelPrint(actionId)
  } finally {
    await clearPendingPrint()
  }
  return true
}

/**
 * Vigila una impresión y la retira si la Point no la recoge a tiempo.
 *
 * Una acción en `created` bloquea el siguiente cobro, y Mercado Pago no
 * publica forma de listar las acciones de una terminal (`GET` devuelve 405):
 * si se pierde el id, ya nadie puede cancelarla y el mostrador se queda sin
 * cobrar con tarjeta hasta que caduque sola. Por eso el ticket se abandona
 * antes que la caja: no salió el papel, pero la venta siguiente entra.
 */
export async function watchPrint(actionId: string, ms = 40_000, cada = 5_000): Promise<string> {
  const deadline = Date.now() + ms
  while (Date.now() < deadline) {
    await new Promise(r => setTimeout(r, cada))
    try {
      const { status } = await printStatus(actionId)
      if (status !== 'created') {
        if (await getPendingPrint() === actionId) await clearPendingPrint()
        return status
      }
    } catch {
      // red intermitente: se vuelve a intentar en el siguiente ciclo
    }
  }
  try {
    await cancelPrint(actionId)
  } finally {
    if (await getPendingPrint() === actionId) await clearPendingPrint()
  }
  return 'canceled'
}

/**
 * Espera el resultado del pago consultando la orden cada 2.5 s hasta que
 * termina o pasan ~5.5 min (la orden expira sola a los 5). `onStatus` va
 * reportando el estado de Mercado Pago para poder mostrarlo en el mostrador:
 * así se distingue "la terminal ya tiene el cobro" de "nunca le llegó".
 */
export async function waitForPayment(
  orderId: string,
  opts?: { signal?: AbortSignal; onStatus?: (status: string, detail?: string) => void },
): Promise<TerminalOutcome> {
  const deadline = Date.now() + 5.5 * 60_000
  while (Date.now() < deadline) {
    if (opts?.signal?.aborted) return 'canceled'
    await new Promise(r => setTimeout(r, 2500))
    try {
      const { status, status_detail } = await call<{ status: string; status_detail?: string }>({ action: 'status', order_id: orderId })
      opts?.onStatus?.(status, status_detail)
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
