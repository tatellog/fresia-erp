import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import { saleReceived } from '../../services/fees'
import { monthProjection } from '../../services/insights'
import { moneyInt } from '../../lib/format'
import { GoalProgress } from './GoalProgress'

/**
 * Meta del mes: cuánto llevas, a qué ritmo, cuánto hay que vender cada día
 * que falta y en cuánto cerrarías el mes si sigues igual. Sin meta
 * guardada usa la meta diaria por los días del mes.
 */
export function MonthGoalCard({ dailyGoal }: { dailyGoal: number }) {
  const ahora = new Date()
  const inicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1).getTime()
  const ventas = useLiveQuery(() => db.sales.where('ts').aboveOrEqual(inicio).toArray(), [inicio])
  const guardada = useLiveQuery(async () => Number((await db.meta.get('goalMonth'))?.value) || 0)
  if (!ventas || guardada === undefined) return null

  const diasMes = new Date(ahora.getFullYear(), ahora.getMonth() + 1, 0).getDate()
  const meta = guardada || dailyGoal * diasMes
  const actual = ventas.reduce((a, s) => a + saleReceived(s), 0)
  const p = monthProjection(actual, meta, ahora.getTime())
  const mes = ahora.toLocaleDateString('es-MX', { month: 'long' })
  const llega = p.projection >= p.goal

  return (
    <div className="rounded-3xl border border-cream-200 bg-cream-50 p-6 lg:p-7">
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-xl font-semibold">Meta de {mes}</h2>
        <span className="text-sm text-berry-700/60">
          {moneyInt(p.goal)}{!guardada && ' · meta diaria × días del mes'}
        </span>
      </div>
      <GoalProgress label="Llevas" valueLabel={moneyInt(p.actual)} pct={Math.round(p.progress)} />
      <div className="mt-5 grid grid-cols-3 gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-berry-700/55">Promedio diario</div>
          <div className="mt-1 font-display text-2xl font-bold tabular-nums">{moneyInt(p.dailyAvg)}</div>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-berry-700/55">Necesitas al día</div>
          <div className={`mt-1 font-display text-2xl font-bold tabular-nums ${p.dailyNeeded > p.dailyAvg ? 'text-amber-700' : ''}`}>
            {p.dailyNeeded > 0 ? moneyInt(p.dailyNeeded) : 'Meta lograda'}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-berry-700/55">Proyección</div>
          <div className={`mt-1 font-display text-2xl font-bold tabular-nums ${llega ? 'text-green-700' : ''}`}>{moneyInt(p.projection)}</div>
        </div>
      </div>
      <p className="mt-4 text-sm text-berry-700/70">
        A este ritmo cerrarías {mes} en <b className="text-berry-900">{moneyInt(p.projection)}</b>
        {llega
          ? `, ${moneyInt(p.projection - p.goal)} arriba de la meta.`
          : `. Para llegar faltan ${moneyInt(p.goal - p.actual)} en ${p.daysLeft} ${p.daysLeft === 1 ? 'día' : 'días'}.`}
      </p>
    </div>
  )
}
