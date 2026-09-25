import type { Sale } from '../data/types'
import { round2 } from '../lib/format'

/**
 * Comisión de la terminal Point de Mercado Pago en México: 3.5 % por venta
 * con tarjeta más el 16 % de IVA sobre esa comisión, que da 4.06 % del
 * monto cobrado. Se descuenta antes de que el dinero llegue a la cuenta.
 */
export const CARD_FEE_RATE = 0.0406
export const CARD_FEE_LABEL = '4.06 %'

/** comisión que se lleva Mercado Pago de un cobro con tarjeta (sobre todo lo cobrado, propina incluida) */
export const cardFee = (charged: number) => round2(charged * CARD_FEE_RATE)

/** comisión que corresponde a una venta según su forma de cobro */
export const feeFor = (payment: Sale['payment'], total: number, tip = 0) =>
  payment === 'tarjeta' ? cardFee(total + tip) : 0

/** lo que de verdad llega por una venta: total + propina − comisión */
export const saleNet = (s: Sale) => round2(s.total + (s.tip ?? 0) - (s.fee ?? 0))

/** comisiones acumuladas de un grupo de ventas */
export const totalFees = (sales: Sale[]) => round2(sales.reduce((a, s) => a + (s.fee ?? 0), 0))

/** propinas acumuladas de un grupo de ventas */
export const totalTips = (sales: Sale[]) => round2(sales.reduce((a, s) => a + (s.tip ?? 0), 0))
