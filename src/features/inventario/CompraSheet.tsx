import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { openCashSession } from '../../services/cash'
import type { Ingredient } from '../../data/types'
import { registerPurchase } from '../../services/inventory'
import { money } from '../../lib/format'
import { Button, decimal, Field, NumberInput, Sheet } from '../../components/ui'
import { ExpensePaymentPicker, type PurchasePayment } from '../caja/ExpensePaymentPicker'

/** registro de compra de un insumo (recalcula costo promedio) */
export function CompraSheet({ ing, onClose }: { ing: Ingredient; onClose: () => void }) {
  const [qty, setQty] = useState('')
  const [cost, setCost] = useState('')
  const [payment, setPayment] = useState<PurchasePayment>('efectivo')
  // caja abierta: la compra queda como gasto del turno con su forma de pago
  const session = useLiveQuery(async () => (await openCashSession()) ?? null)
  const q = decimal(qty), c = decimal(cost)
  const valid = q > 0 && c >= 0
  return (
    <Sheet open onClose={onClose} title={`Compra · ${ing.name}`}>
      <Field label={`Cantidad comprada (${ing.unit})`}>
        <NumberInput value={qty} onChange={e => setQty(e.target.value)} autoFocus />
      </Field>
      <Field label="Costo total de la compra ($)">
        <NumberInput value={cost} onChange={e => setCost(e.target.value)} />
      </Field>
      {valid && q > 0 && (
        <p className="mb-3 text-sm text-berry-700/70">
          Costo unitario de esta compra: <b>{money(c / q)}</b> / {ing.unit}
        </p>
      )}
      {session ? (
        <ExpensePaymentPicker value={payment} onChange={setPayment} allowOutside />
      ) : (
        <p className="mb-3 rounded-xl bg-cream-200/60 px-3 py-2 text-xs text-berry-700/70">
          La caja está cerrada: la compra solo entra al inventario. Para que cuente como gasto del turno, abre la caja primero.
        </p>
      )}
      <Button
        className="w-full"
        disabled={!valid}
        onClick={async () => {
          const enCaja = session && payment !== 'fuera'
          await registerPurchase(ing.id, q, c, undefined, enCaja ? session.id : undefined, enCaja ? payment : 'efectivo')
          onClose()
        }}
      >
        Registrar compra
      </Button>
    </Sheet>
  )
}
