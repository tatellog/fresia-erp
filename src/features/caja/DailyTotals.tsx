import { BagIcon, BanknoteIcon, CreditCardIcon, BankIcon, ReceiptIcon, StarIcon } from '../../components/ui/icons'
import { CARD_FEE_LABEL } from '../../services/fees'
import { money, moneyInt } from '../../lib/format'
import { CashSummaryCard } from './CashSummaryCard'

/** hero de Caja: efectivo esperado, tarjeta (con lo que de verdad llega), transferencias, delivery, propinas y total del turno (o del día con la caja cerrada) */
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
        value={money(cardNet)}
        hint={card > 0
          ? `lo que te deposita Mercado Pago · cobraste ${money(card)} y restó su comisión de ${CARD_FEE_LABEL} (${money(cardFees)})`
          : `Mercado Pago descuenta ${CARD_FEE_LABEL} de cada cobro`}
      />
      <CashSummaryCard icon={BankIcon} label="Transferencias" value={money(transfer)} />
      <CashSummaryCard icon={BagIcon} label="Delivery · Rappi, DiDi y Frésia Office" value={money(delivery)} hint="Rappi y DiDi te lo depositan después" />
      <CashSummaryCard icon={StarIcon} label="Propinas" value={money(tips)} hint="para el equipo · no cuentan en la caja" />
      <CashSummaryCard icon={ReceiptIcon} label={open ? 'Ventas del turno' : 'Ventas del día'} value={moneyInt(total)} hint={`ya sin la comisión de tarjeta${open ? ' · desde que se abrió la caja' : ''}`} />
    </div>
  )
}
