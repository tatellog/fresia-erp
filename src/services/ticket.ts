import type { Payment } from '../data/types'
import { fmtDateTime, money } from '../lib/format'
import type { CartLine } from './sales'
import { lineUnitPrice } from './sales'

/**
 * Ticket de venta para la impresora térmica de la Point Smart: se dibuja
 * en un canvas (58 mm ≈ 384 px) y se manda como PNG en base64 por la
 * acción `print` de la Edge Function `mp`.
 */

const W = 384
const M = 16
const INNER = W - M * 2

const DISPLAY = '"Cormorant Garamond", Georgia, serif'
const SANS = 'Jost, system-ui, sans-serif'

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

/** parte un texto en renglones que caben en `maxWidth` */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const out: string[] = []
  let line = ''
  for (const word of text.split(/\s+/)) {
    const probe = line ? `${line} ${word}` : word
    if (ctx.measureText(probe).width <= maxWidth || !line) line = probe
    else {
      out.push(line)
      line = word
    }
  }
  if (line) out.push(line)
  return out
}

/** dibuja el ticket y devuelve el PNG en base64 (sin el prefijo data:) */
export async function renderTicket(data: TicketData): Promise<string> {
  await Promise.all([
    document.fonts.load(`700 46px ${DISPLAY}`),
    document.fonts.load(`italic 600 20px ${DISPLAY}`),
    document.fonts.load(`600 15px ${SANS}`),
    document.fonts.load(`400 13px ${SANS}`),
  ]).catch(() => {})

  // primer lienzo sobrado de alto; al final se recorta a lo dibujado
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = 600 + data.lines.length * 140
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('No se pudo preparar el ticket')

  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#000'
  ctx.textBaseline = 'alphabetic'

  let y = 54
  const center = (text: string, font: string, advance: number) => {
    ctx.font = font
    ctx.textAlign = 'center'
    ctx.fillText(text, W / 2, y)
    y += advance
  }
  const dashes = (dashed = true) => {
    y += 6
    ctx.save()
    ctx.strokeStyle = '#000'
    ctx.lineWidth = 1.5
    if (dashed) ctx.setLineDash([4, 5])
    ctx.beginPath()
    ctx.moveTo(M, y)
    ctx.lineTo(W - M, y)
    ctx.stroke()
    ctx.restore()
    y += 26
  }

  center('Frésia', `700 46px ${DISPLAY}`, 24)
  center('F R E S A S   C O N   C R E M A', `600 12px ${SANS}`, 26)
  center(fmtDateTime(data.ts), `400 13px ${SANS}`, data.attendant ? 20 : 6)
  if (data.attendant) center(`Te atendió ${data.attendant}`, `400 13px ${SANS}`, 6)

  dashes()

  for (const line of data.lines) {
    const unit = lineUnitPrice(line)
    const priceText = money(unit * line.qty)
    ctx.font = `700 15px ${SANS}`
    const priceWidth = ctx.measureText(priceText).width
    ctx.textAlign = 'right'
    ctx.fillText(priceText, W - M, y)

    ctx.textAlign = 'left'
    ctx.font = `600 15px ${SANS}`
    const name = line.qty > 1 ? `${line.qty} × ${line.product.name}` : line.product.name
    const nameLines = wrap(ctx, name, INNER - priceWidth - 12)
    for (const l of nameLines) {
      ctx.fillText(l, M, y)
      y += 20
    }
    if (line.qty > 1) {
      ctx.font = `400 12px ${SANS}`
      ctx.fillText(`${money(unit)} c/u`, M + 14, y)
      y += 18
    }
    const detalle = [...line.toppings.map(t => t.name), ...line.extras.map(e => `+ ${e.name}`)]
    if (detalle.length) {
      ctx.font = `400 13px ${SANS}`
      for (const l of wrap(ctx, detalle.join(', '), INNER - 14)) {
        ctx.fillText(l, M + 14, y)
        y += 18
      }
    }
    y += 8
  }

  dashes(false)

  ctx.font = `600 15px ${SANS}`
  ctx.textAlign = 'left'
  ctx.fillText('TOTAL', M, y + 2)
  ctx.font = `700 34px ${DISPLAY}`
  ctx.textAlign = 'right'
  ctx.fillText(money(data.total), W - M, y + 6)
  y += 32

  ctx.font = `400 13px ${SANS}`
  ctx.textAlign = 'left'
  ctx.fillText(`Pago: ${PAYMENT_LABEL[data.payment]}`, M, y)
  y += 20
  if (data.payment === 'efectivo' && data.paid != null && data.change != null) {
    ctx.fillText(`Recibido ${money(data.paid)} · Cambio ${money(data.change)}`, M, y)
    y += 20
  }

  y += 26
  center('Para mi bombón.', `italic 600 20px ${DISPLAY}`, 24)
  center('HECHAS AL MOMENTO', `600 10px ${SANS}`, 0)
  y += 30

  // recorte al alto real dibujado
  const out = document.createElement('canvas')
  out.width = W
  out.height = Math.min(y, canvas.height)
  const octx = out.getContext('2d')
  if (!octx) throw new Error('No se pudo preparar el ticket')
  octx.drawImage(canvas, 0, 0)
  return out.toDataURL('image/png').split(',')[1]
}
