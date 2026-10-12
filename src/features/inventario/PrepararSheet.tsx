import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import type { Ingredient } from '../../data/types'
import { money } from '../../lib/format'
import { prepPlan, registerPreparation } from '../../services/inventory'
import { bulkUnit, fmtQty, fmtUnitCost } from '../../services/units'
import { Button, decimal, Field, NumberInput, Sheet } from '../../components/ui'

/**
 * «Preparé crema»: cuánto salió del lote. Muestra lo que se va a descontar
 * de cada ingrediente y cuánto costó, con los costos de las últimas compras.
 */
export function PrepararSheet({ ing, onClose }: { ing: Ingredient; onClose: () => void }) {
  const ingredients = useLiveQuery(() => db.ingredients.toArray())
  const grande = bulkUnit(ing.unit)
  const lote = ing.prep?.batch ?? ing.prep?.yield ?? 0
  const [qty, setQty] = useState(() => String(grande ? lote / 1000 : lote))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!ingredients) return null
  const q = decimal(qty) * (grande ? 1000 : 1)
  const plan = prepPlan(ing, q, new Map(ingredients.map(i => [i.id, i])))

  const guardar = async () => {
    setBusy(true)
    try {
      await registerPreparation(ing.id, q)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo registrar')
      setBusy(false)
    }
  }

  return (
    <Sheet open onClose={onClose} title={`Preparé ${ing.name.toLowerCase()}`}>
      <Field label="¿Cuánto salió?">
        <div className="flex items-center gap-2">
          <NumberInput value={qty} onChange={e => setQty(e.target.value)} autoFocus />
          <span className="shrink-0 text-sm text-berry-700/60">{grande ?? (ing.unit === 'pza' ? 'pzas' : ing.unit)}</span>
        </div>
      </Field>

      {q > 0 && (
        <>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-berry-700/50">Se descuenta del inventario</p>
          <div className="mb-4 space-y-2">
            {plan.lines.map(l => (
              <div key={l.ingredientId} className="flex items-baseline justify-between gap-3 text-[15px]">
                <span className="min-w-0">
                  <span className="font-medium">{l.ing?.name ?? 'Insumo borrado'}</span>
                  {l.ing && <span className="ml-2 text-xs text-berry-700/55">{fmtQty(l.qty, l.ing.unit)}</span>}
                </span>
                <span className="shrink-0 tabular-nums text-berry-700/70">{l.cost > 0 ? money(l.cost) : 'sin costo'}</span>
              </div>
            ))}
          </div>

          <div className="mb-4 flex items-baseline justify-between border-t border-cream-200 pt-3.5">
            <span className="text-sm font-medium text-berry-700/70">
              Costo del lote{plan.perUnit > 0 && <> · {fmtUnitCost(plan.perUnit, ing.unit)}</>}
            </span>
            <span className="font-display text-[26px] font-bold tabular-nums">{money(plan.total)}</span>
          </div>
          {plan.sinCosto.length > 0 && (
            <p className="mb-4 text-xs text-amber-700">
              {plan.sinCosto.join(', ')} aún no {plan.sinCosto.length === 1 ? 'tiene' : 'tienen'} costo: registra su compra para que el costo salga completo.
            </p>
          )}
        </>
      )}

      {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
      <Button className="w-full" disabled={!(q > 0) || busy} onClick={guardar}>
        {busy ? 'Registrando…' : `Registrar ${q > 0 ? fmtQty(q, ing.unit) : ''}`}
      </Button>
    </Sheet>
  )
}
