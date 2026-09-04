import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import type { Ingredient } from '../../data/types'
import { registerPurchase } from '../../services/inventory'
import { money } from '../../lib/format'
import { Button, decimal, Field, NumberInput, Sheet } from '../../components/ui'

/** registro de compra de un insumo (recalcula costo promedio) */
export function CompraSheet({ ing, onClose }: { ing: Ingredient; onClose: () => void }) {
  const [qty, setQty] = useState('')
  const [cost, setCost] = useState('')
  const [fromCash, setFromCash] = useState(true)
  // caja abierta: la compra puede pagarse con efectivo del turno
  const session = useLiveQuery(async () => (await db.cashSessions.filter(s => s.closeTs === undefined).last()) ?? null)
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
      {session && (
        <button
          onClick={() => setFromCash(v => !v)}
          className={`mb-3 flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors ${
            fromCash ? 'border-berry-500 bg-berry-50 text-berry-700' : 'border-cream-300 text-berry-700/70'
          }`}
        >
          <span>Se pagó con efectivo de la caja</span>
          <span className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold ${
            fromCash ? 'bg-berry-500 text-white' : 'border border-cream-300'
          }`}>
            {fromCash ? '✓' : ''}
          </span>
        </button>
      )}
      <Button
        className="w-full"
        disabled={!valid}
        onClick={async () => { await registerPurchase(ing.id, q, c, undefined, session && fromCash ? session.id : undefined); onClose() }}
      >
        Registrar compra
      </Button>
    </Sheet>
  )
}
