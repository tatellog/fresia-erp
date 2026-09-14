import type { Payment } from '../data/types'
import { fmtDateTime, money } from '../lib/format'
import type { CartLine } from './sales'
import { lineUnitPrice } from './sales'

/**
 * Ticket de venta para la impresora térmica de la Point Smart.
 *
 * Se manda como texto con etiquetas de formato (subtipo `custom` de la acción
 * `print`), no como imagen: la Point acepta los PNG y los JPEG y después no
 * los imprime —la acción muere en `on_terminal` y caduca—, mientras que el
 * texto sale sin falta. Se pierde la tipografía de marca a cambio de que el
 * papel salga, que es de lo que vive el mostrador.
 */

/** columnas de la impresora de 58 mm en tamaño normal */
const COLS = 32

/** Mercado Pago exige entre 100 y 4096 caracteres en el contenido */
const MIN = 100
const MAX = 4096

export const PAYMENT_LABEL: Record<Payment, string> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  rappi: 'Rappi',
  didi: 'DiDi',
  uber: 'Uber Eats',
}

export interface TicketData {
  lines: CartLine[]
  total: number
  payment: Payment
  paid?: number
  change?: number
  attendant?: string
  ts: number
}

/**
 * La impresora no tiene acentos ni ñ: sin esto salen como basura o huecos.
 * Se quitan las tildes y la ñ pasa a «n», que se lee peor pero se lee.
 */
const plano = (s: string) =>
  s.replace(/[·•]/g, '-')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '')

/** parte un texto en renglones que caben en `ancho` columnas */
function wrap(text: string, ancho: number): string[] {
  const out: string[] = []
  let line = ''
  for (const word of text.split(/\s+/)) {
    const probe = line ? `${line} ${word}` : word
    if (probe.length <= ancho || !line) line = probe
    else {
      out.push(line)
      line = word
    }
  }
  return line ? [...out, line] : out
}

/** nombre a la izquierda y precio pegado a la derecha, en una sola línea */
function fila(izq: string, der: string, ancho = COLS): string[] {
  const renglones = wrap(izq, ancho - der.length - 1)
  const ultimo = renglones.pop() ?? ''
  const hueco = Math.max(1, ancho - ultimo.length - der.length)
  return [...renglones, ultimo + ' '.repeat(hueco) + der]
}

/**
 * Dibuja el ticket como contenido `custom` de la acción de impresión.
 * Etiquetas: `{br}` salto, `{center}` centrado, `{w}…{/w}` ancho, `{s}` chico.
 */
export function renderTicket(data: TicketData): string {
  const L: string[] = []
  const push = (s = '') => L.push(plano(s))
  const centro = (s: string) => push(`{center}${s}`)
  const regla = () => push('-'.repeat(COLS))

  centro('{w}FRESIA{/w}')
  centro('FRESAS CON CREMA')
  centro(fmtDateTime(data.ts))
  if (data.attendant) centro(`Te atendio ${data.attendant}`)
  push()
  regla()

  for (const line of data.lines) {
    const unit = lineUnitPrice(line)
    const nombre = line.qty > 1 ? `${line.qty} x ${line.product.name}` : line.product.name
    for (const r of fila(nombre, money(unit * line.qty))) push(r)
    if (line.qty > 1) push(`  ${money(unit)} c/u`)
    const detalle = [...line.toppings.map(t => t.name), ...line.extras.map(e => `+ ${e.name}`)]
    if (detalle.length) for (const r of wrap(detalle.join(', '), COLS - 2)) push(`  ${r}`)
  }

  regla()
  for (const r of fila('TOTAL', money(data.total))) push(`{w}${r}{/w}`)
  push(`Pago: ${PAYMENT_LABEL[data.payment]}`)
  if (data.payment === 'efectivo' && data.paid != null && data.change != null) {
    push(`Recibido ${money(data.paid)} - Cambio ${money(data.change)}`)
  }
  push()
  centro('Para mi bombon.')
  centro('{s}HECHAS AL MOMENTO')
  push()

  let out = L.join('{br}') + '{br}'
  // el mínimo de Mercado Pago se cubre alargando el corte de papel
  while (out.length < MIN) out += '{br}'
  return out.slice(0, MAX)
}
