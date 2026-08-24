import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import { registerPurchase } from '../../services/inventory'
import { money } from '../../lib/format'
import { Button, Field, Input, Sheet } from '../../components/ui'

/**
 * Compra de insumos pagada con efectivo de la caja: en un solo paso
 * descuenta el gasto del turno y sube el stock con su costo promedio.
 */
export function CompraInsumoSheet({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const ingredients = useLiveQuery(() => db.ingredients.orderBy('name').toArray())
  const [ingId, setIngId] = useState('')
  const [qty, setQty] = useState('')
  const [cost, setCost] = useState('')

  const ing = ingredients?.find(i => i.id === ingId)
  const q = parseFloat(qty), c = parseFloat(cost)
  const valid = !!ing && q > 0 && c > 0

  return (
    <Sheet open onClose={onClose} title="Compra de insumos">
      <p className="mb-3 text-sm text-berry-700/70">
        Tomaste efectivo de la caja para comprar: aquí queda el gasto del turno y la entrada al inventario, de una vez.
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
            <Input type="number" inputMode="decimal" value={qty} onChange={e => setQty(e.target.value)} />
          </Field>
          <Field label="Costo total pagado ($)">
            <Input type="number" inputMode="decimal" value={cost} onChange={e => setCost(e.target.value)} />
          </Field>
          {valid && (
            <p className="mb-3 text-sm text-berry-700/70">
              Sale de caja <b>{money(c)}</b> · entran <b>{qty} {ing.unit}</b> a {money(c / q)}/{ing.unit}
            </p>
          )}
        </>
      )}
      <Button
        className="w-full"
        disabled={!valid}
        onClick={async () => { await registerPurchase(ing!.id, q, c, undefined, sessionId); onClose() }}
      >
        Registrar compra
      </Button>
    </Sheet>
  )
}
