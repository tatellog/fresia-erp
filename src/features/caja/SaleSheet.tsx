import { useState } from 'react'
import type { Payment, Sale } from '../../data/types'
import { setSalePayment, voidSale } from '../../services/sales'
import { fmtTime, money } from '../../lib/format'
import { Button, Sheet } from '../../components/ui'
import { PaymentPicker } from '../vender/PaymentPicker'

/** detalle de una venta del turno: corregir el método de cobro o anularla */
export function SaleSheet({ sale, onClose }: { sale: Sale; onClose: () => void }) {
  const [payment, setPayment] = useState<Payment>(sale.payment)
  const [busy, setBusy] = useState(false)

  const guardar = async () => {
    if (payment !== sale.payment) await setSalePayment(sale.id, payment)
    onClose()
  }

  const anular = async () => {
    if (!confirm('La venta se anula: sale del corte y del historial, y los insumos regresan al inventario. ¿Anular?')) return
    setBusy(true)
    await voidSale(sale.id)
    onClose()
  }

  return (
    <Sheet open onClose={onClose} title={`Venta de las ${fmtTime(sale.ts)}`}>
      <div className="mb-4 space-y-2.5">
        {sale.items.map((it, i) => (
          <div key={i} className="flex items-baseline justify-between gap-3 text-[15px]">
            <div className="min-w-0">
              <span className="font-medium">{it.qty}× {it.name}</span>
              {!!it.toppings?.length && (
                <div className="text-xs text-berry-700/55">{it.toppings.join(', ')}</div>
              )}
              {!!it.extras?.length && (
                <div className="text-xs text-berry-700/55">+ {it.extras.join(', ')}</div>
              )}
            </div>
            <span className="shrink-0 font-medium tabular-nums">{money(it.price * it.qty)}</span>
          </div>
        ))}
      </div>

      <div className="mb-4 flex items-baseline justify-between border-t border-cream-200 pt-3.5">
        <span className="text-sm font-medium text-berry-700/70">
          Total{sale.employeeName && <> · atendió {sale.employeeName}</>}
        </span>
        <span className="font-display text-[26px] font-bold tabular-nums">{money(sale.total)}</span>
      </div>

      <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-berry-700/50">Método de cobro</p>
      <PaymentPicker payment={payment} setPayment={setPayment} />

      <Button className="w-full" disabled={busy} onClick={guardar}>
        {payment !== sale.payment ? 'Guardar cambio' : 'Cerrar'}
      </Button>
      <button
        onClick={anular}
        disabled={busy}
        className="mt-3 w-full text-center text-sm font-semibold text-red-600 active:opacity-60"
      >
        {busy ? 'Anulando…' : 'Anular venta'}
      </button>
    </Sheet>
  )
}
