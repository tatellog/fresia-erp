import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import type { Ingredient, InventoryCount } from '../../data/types'
import { wasteAnalysis } from '../../services/alerts'
import { fmtQty } from '../../services/units'
import { moneyInt } from '../../lib/format'

/**
 * Merma de las últimas 4 semanas en pesos: lo que faltó en los conteos
 * (sin explicación) y lo que se anotó a mano, por semana, con los
 * insumos que más pesan. Solo aparece cuando ya hay algo que mostrar.
 */
export function WasteCard({ counts, ingredients }: { counts: InventoryCount[]; ingredients: Ingredient[] }) {
  const wastes = useLiveQuery(() => db.wastes.where('ts').aboveOrEqual(Date.now() - 35 * 24 * 3600_000).toArray())
  if (!wastes) return null
  const { weeks, top, total } = wasteAnalysis(counts, wastes, new Map(ingredients.map(i => [i.id, i])))
  if (total <= 0) return null

  const max = Math.max(...weeks.map(w => w.unidentified + w.recorded), 1)
  const actual = weeks.at(-1)!
  const previas = weeks.slice(0, -1).filter(w => w.unidentified + w.recorded > 0)
  const promedio = previas.length ? previas.reduce((a, w) => a + w.unidentified + w.recorded, 0) / previas.length : 0
  const esta = actual.unidentified + actual.recorded
  const fecha = (ts: number) => new Date(ts).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })

  return (
    <section className="mb-6 rounded-2xl border border-cream-200 bg-cream-50 p-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-base font-semibold">Merma · últimas 4 semanas</h2>
        <span className="font-display text-xl font-bold tabular-nums text-red-600">{moneyInt(total)}</span>
      </div>
      {promedio > 0 && (
        <p className="mt-0.5 text-xs text-berry-700/60">
          Esta semana {moneyInt(esta)}: {esta > promedio * 1.15 ? 'más que' : esta < promedio * 0.85 ? 'menos que' : 'parecido a'} el promedio de {moneyInt(promedio)}.
        </p>
      )}
      <div className="mt-4 flex h-24 items-end gap-3">
        {weeks.map(w => {
          const t = w.unidentified + w.recorded
          return (
            <div key={w.start} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[11px] tabular-nums text-berry-700/60">{t > 0 ? moneyInt(t) : ''}</span>
              <div className="flex w-full flex-col justify-end overflow-hidden rounded-md bg-cream-200/60" style={{ height: '4rem' }}>
                <div className="bg-amber-500/70" style={{ height: `${(w.recorded / max) * 100}%` }} />
                <div className="bg-red-500/80" style={{ height: `${(w.unidentified / max) * 100}%` }} />
              </div>
              <span className="text-[10px] text-berry-700/50">{fecha(w.start)}</span>
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex gap-4 text-[11px] text-berry-700/60">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-red-500/80" />faltó en conteo</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-500/70" />anotada a mano</span>
      </div>
      {top.length > 0 && (
        <div className="mt-3 border-t border-cream-200/70 pt-3">
          {top.map(e => (
            <div key={e.name} className="flex justify-between py-0.5 text-sm">
              <span className="truncate">{e.name}{e.unit && <span className="text-berry-700/50"> · {fmtQty(e.qty, e.unit)}</span>}</span>
              <span className="shrink-0 font-medium tabular-nums">{moneyInt(e.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
