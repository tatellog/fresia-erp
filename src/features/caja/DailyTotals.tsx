import { BagIcon, BanknoteIcon, CreditCardIcon, BankIcon, ReceiptIcon, StarIcon } from '../../components/ui/icons'
import { CARD_FEE_LABEL } from '../../services/fees'
import { money } from '../../lib/format'
import { CashSummaryCard } from './CashSummaryCard'

/** hero de Caja: efectivo esperado, tarjeta (con lo que de verdad llega), transferencias, delivery, propinas y total del día */
export function DailyTotals({ expected, card, cardNet, cardFees, transfer, delivery, tips, total, open }: {
  expected: number
  /** cobrado con tarjeta (ventas, sin propinas) */
  card: number
  /** lo que Mercado Pago deposita: cobrado + propinas − comisión */
  cardNet: number
  cardFees: number
  transfer: number
  delivery: number
  tips: number
  total: number
  open: boolean
}) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-3 xl:gap-4">
      <CashSummaryCard
        icon={BanknoteIcon}
        label="Efectivo esperado"
        value={open ? money(expected) : '·'}
        hint={open ? 'fondo + ventas en efectivo − gastos en efectivo − retiros' : 'abre la caja para calcularlo'}
      />
      <CashSummaryCard
        icon={CreditCardIcon}
        label="Ventas con tarjeta"
        value={money(card)}
        hint={card > 0
          ? `Mercado Pago te deposita ${money(cardNet)}: ya restó su comisión de ${CARD_FEE_LABEL} (${money(cardFees)})`
          : `Mercado Pago descuenta ${CARD_FEE_LABEL} de cada cobro`}
      />
      <CashSummaryCard icon={BankIcon} label="Transferencias" value={money(transfer)} />
      <CashSummaryCard icon={BagIcon} label="Delivery · Rappi y Uber" value={money(delivery)} hint="la app te lo deposita después" />
      <CashSummaryCard icon={StarIcon} label="Propinas" value={money(tips)} hint="para el equipo · no cuentan en la caja" />
      <CashSummaryCard icon={ReceiptIcon} label="Ventas del día" value={money(total)} />
    </div>
  )
}
