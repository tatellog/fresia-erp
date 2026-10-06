import { useState } from 'react'
import type { Ingredient } from '../../data/types'
import { registerWaste } from '../../services/inventory'
import { bulkUnit, fmtQty } from '../../services/units'
import { Button, decimal, Field, Input, NumberInput, QuickChips, Sheet } from '../../components/ui'

const MOTIVOS = ['Se echó a perder', 'Caducó', 'Se cayó', 'Prueba o degustación', 'Cortesía']

/** registro de merma (pérdida) de un insumo; acepta kg o L y motivos de un toque */
export function MermaSheet({ ing, onClose }: { ing: Ingredient; onClose: () => void }) {
  const grande = bulkUnit(ing.unit)
  const [qty, setQty] = useState('')
  const [bulk, setBulk] = useState(false)
  const [reason, setReason] = useState('')
  const q = decimal(qty) * (bulk && grande ? 1000 : 1)
  return (
    <Sheet open onClose={onClose} title={`Merma · ${ing.name}`}>
      <Field label="Cantidad perdida">
        <div className="flex items-center gap-2">
          <NumberInput value={qty} onChange={e => setQty(e.target.value)} autoFocus />
          {grande ? (
            <button type="button" onClick={() => setBulk(b => !b)} className="shrink-0 rounded-full border border-cream-300 px-3 py-2 text-sm font-semibold text-berry-700">
              {bulk ? grande : ing.unit}
            </button>
          ) : (
            <span className="shrink-0 text-sm text-berry-700/60">pzas</span>
          )}
        </div>
      </Field>
      {q > 0 && grande && <p className="-mt-1 mb-3 text-xs text-berry-700/60">{fmtQty(q, ing.unit)}</p>}
      <Field label="Motivo">
        <QuickChips options={MOTIVOS} value={reason} onPick={setReason} />
        <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="O escribe otro…" />
      </Field>
      <Button className="w-full" disabled={!(q > 0)} onClick={async () => { await registerWaste(ing.id, q, reason.trim() || 'Sin motivo'); onClose() }}>
        Registrar merma
      </Button>
    </Sheet>
  )
}
