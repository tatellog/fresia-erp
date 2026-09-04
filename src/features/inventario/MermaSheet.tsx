import { useState } from 'react'
import type { Ingredient } from '../../data/types'
import { registerWaste } from '../../services/inventory'
import { Button, decimal, Field, Input, NumberInput, Sheet } from '../../components/ui'

/** registro de merma (pérdida) de un insumo */
export function MermaSheet({ ing, onClose }: { ing: Ingredient; onClose: () => void }) {
  const [qty, setQty] = useState('')
  const [reason, setReason] = useState('')
  const q = decimal(qty)
  return (
    <Sheet open onClose={onClose} title={`Merma · ${ing.name}`}>
      <Field label={`Cantidad perdida (${ing.unit})`}>
        <NumberInput value={qty} onChange={e => setQty(e.target.value)} autoFocus />
      </Field>
      <Field label="Motivo">
        <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Se echó a perder, caducó…" />
      </Field>
      <Button className="w-full" disabled={!(q > 0)} onClick={async () => { await registerWaste(ing.id, q, reason || 'Sin motivo'); onClose() }}>
        Registrar merma
      </Button>
    </Sheet>
  )
}
