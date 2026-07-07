import { useState } from 'react'
import type { CashSession } from '../../data/types'
import { closeCash } from '../../services/cash'
import { money, round2 } from '../../lib/format'
import { Button } from '../../components/ui'
import { CashDifferenceCard } from './CashDifferenceCard'

/** corte de caja: contado vs. esperado, justificación de diferencias y cierre */
export function CashCountForm({ session, expected }: { session: CashSession; expected: number }) {
  const [counted, setCounted] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const c = parseFloat(counted)
  const hasValue = counted !== '' && c >= 0
  const diff = hasValue ? round2(c - expected) : 0

  const save = async () => {
    setBusy(true)
    await closeCash(session, c, expected, diff !== 0 ? note : undefined)
    setBusy(false)
  }

  return (
    <div className="rounded-3xl border border-cream-200 bg-cream-50 p-6 lg:p-8">
      <h2 className="mb-1 text-2xl font-semibold">Corte de caja</h2>
      <p className="mb-6 text-sm text-berry-700/60">Cuenta el efectivo del cajón y captura el total.</p>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="mb-5 flex items-baseline justify-between rounded-2xl bg-cream-200/60 px-5 py-4">
            <span className="text-sm font-medium text-berry-700/70">Efectivo esperado</span>
            <span className="font-display text-2xl font-bold tabular-nums">{money(expected)}</span>
          </div>
          <label className="block">
            <span className="mb-2 block text-sm font-medium text-berry-700">Efectivo contado</span>
            <div className="flex items-center rounded-2xl border-2 border-cream-300 bg-cream-50 px-5 focus-within:border-berry-400">
              <span className="mr-1 font-display text-3xl font-bold text-berry-700/40">$</span>
              <input
                type="number" inputMode="decimal" value={counted}
                onChange={e => setCounted(e.target.value)}
                placeholder="0"
                className="w-full bg-transparent py-4 font-display text-3xl font-bold tabular-nums outline-none"
              />
            </div>
          </label>
        </div>

        <div className="flex flex-col justify-between gap-4">
          {hasValue && (
            diff === 0 ? (
              <div className="rounded-2xl border border-green-600/25 bg-green-100 px-5 py-4 text-sm font-semibold text-green-700">
                Cuadra exacto · todo en orden
              </div>
            ) : (
              <CashDifferenceCard diff={diff} note={note} setNote={setNote} />
            )
          )}
          <Button
            className="w-full py-4 text-lg"
            disabled={!hasValue || busy || (diff !== 0 && !note.trim())}
            onClick={save}
          >
            Guardar corte
          </Button>
        </div>
      </div>
    </div>
  )
}
