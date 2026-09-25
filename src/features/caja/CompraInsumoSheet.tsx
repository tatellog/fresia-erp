import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import { registerPurchase } from '../../services/inventory'
import { money } from '../../lib/format'
import { Button, decimal, Field, NumberInput, Sheet } from '../../components/ui'
import { ExpensePaymentPicker, type PurchasePayment } from './ExpensePaymentPicker'

/**
 * Compra de insumos desde la caja: en un solo paso queda el gasto del
 * turno con su forma de pago y sube el stock con su costo promedio.
 * Solo lo pagado en efectivo baja el efectivo esperado del corte.
 */
export function CompraInsumoSheet({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const ingredients = useLiveQuery(() => db.ingredients.orderBy('name').toArray())
  const [ingId, setIngId] = useState('')
  const [qty, setQty] = useState('')
  const [cost, setCost] = useState('')
  const [payment, setPayment] = useState<PurchasePayment>('efectivo')

  const ing = ingredients?.find(i => i.id === ingId)
  const q = decimal(qty), c = decimal(cost)
  const valid = !!ing && q > 0 && c > 0

  return (
    <Sheet open onClose={onClose} title="Compra de insumos">
      <p className="mb-3 text-sm text-berry-700/70">
        Aquí queda el gasto del turno y la entrada al inventario, de una vez.
      </p>
      <Field label="Insumo">
        <select
          value={ingId}
          onChange={e => setIngId(e.target.value)}
          className="w-full appearance-none rounded-xl border border-cream-300 bg-cream-50 px-3 py-2.5 text-base outline-none focus:border-berry-400"
        >
          <option value="">Elige un insumo…</option>
          {(ingredients ?? []).map(i => (
            <option key={i.id} value={i.id}>{i.name}</option>
          ))}
        </select>
      </Field>
      {ing && (
        <>
          <Field label={`Cantidad comprada (${ing.unit})`}>
            <NumberInput value={qty} onChange={e => setQty(e.target.value)} />
          </Field>
          <Field label="Costo total pagado ($)">
            <NumberInput value={cost} onChange={e => setCost(e.target.value)} />
          </Field>
          <ExpensePaymentPicker value={payment} onChange={setPayment} />
          {valid && (
            <p className="mb-3 text-sm text-berry-700/70">
              {payment === 'efectivo' ? 'Sale de caja' : 'Gasto del turno'} <b>{money(c)}</b> · entran <b>{qty} {ing.unit}</b> a {money(c / q)}/{ing.unit}
            </p>
          )}
        </>
      )}
      <Button
        className="w-full"
        disabled={!valid}
        onClick={async () => {
          await registerPurchase(ing!.id, q, c, undefined, sessionId, payment === 'fuera' ? 'efectivo' : payment)
          onClose()
        }}
      >
        Registrar compra
      </Button>
    </Sheet>
  )
}
