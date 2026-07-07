import { BagIcon, BanknoteIcon, CreditCardIcon, BankIcon, ReceiptIcon } from '../../components/ui/icons'
import { money } from '../../lib/format'
import { CashSummaryCard } from './CashSummaryCard'

/** hero de Caja: efectivo esperado, tarjeta, transferencias, delivery y total del día */
export function DailyTotals({ expected, card, transfer, delivery, total, open }: {
  expected: number
  card: number
  transfer: number
  delivery: number
  total: number
  open: boolean
}) {
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-5 xl:gap-4">
      <CashSummaryCard
        icon={BanknoteIcon}
        label="Efectivo esperado"
        value={open ? money(expected) : '·'}
        hint={open ? 'fondo + ventas − gastos − retiros' : 'abre la caja para calcularlo'}
      />
      <CashSummaryCard icon={CreditCardIcon} label="Ventas con tarjeta" value={money(card)} />
      <CashSummaryCard icon={BankIcon} label="Transferencias" value={money(transfer)} />
      <CashSummaryCard icon={BagIcon} label="Delivery · Rappi y Uber" value={money(delivery)} hint="la app te lo deposita después" />
      <CashSummaryCard icon={ReceiptIcon} label="Ventas del día" value={money(total)} />
    </div>
  )
}
