import { useState } from 'react'
import type { Ingredient } from '../../data/types'
import { registerPurchase } from '../../services/inventory'
import { money } from '../../lib/format'
import { Button, Field, Input, Sheet } from '../../components/ui'

/** registro de compra de un insumo (recalcula costo promedio) */
export function CompraSheet({ ing, onClose }: { ing: Ingredient; onClose: () => void }) {
  const [qty, setQty] = useState('')
  const [cost, setCost] = useState('')
  const q = parseFloat(qty), c = parseFloat(cost)
  const valid = q > 0 && c >= 0
  return (
    <Sheet open onClose={onClose} title={`Compra · ${ing.name}`}>
      <Field label={`Cantidad comprada (${ing.unit})`}>
        <Input type="number" inputMode="decimal" value={qty} onChange={e => setQty(e.target.value)} autoFocus />
      </Field>
      <Field label="Costo total de la compra ($)">
        <Input type="number" inputMode="decimal" value={cost} onChange={e => setCost(e.target.value)} />
      </Field>
      {valid && q > 0 && (
        <p className="mb-3 text-sm text-berry-700/70">
          Costo unitario de esta compra: <b>{money(c / q)}</b> / {ing.unit}
        </p>
      )}
      <Button className="w-full" disabled={!valid} onClick={async () => { await registerPurchase(ing.id, q, c); onClose() }}>
        Registrar compra
      </Button>
    </Sheet>
  )
}
