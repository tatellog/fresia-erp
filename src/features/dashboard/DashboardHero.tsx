import { money } from '../../lib/format'
import { GoalProgress } from './GoalProgress'

/** card protagonista: ventas de hoy, vasos, comparación con ayer y meta diaria */
export function DashboardHero({ total, cups, deltaPct, goalMoney }: {
  total: number
  cups: number
  deltaPct: number | null
  goalMoney: number
}) {
  return (
    <div className="rounded-3xl border border-cream-200 bg-cream-50 p-7 lg:p-9">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-berry-700/60">Ventas de hoy</div>
          <div className="mt-2 font-display text-[56px] font-bold leading-none tabular-nums lg:text-[68px]">{money(total)}</div>
          <div className="mt-3 flex items-center gap-3 text-sm text-berry-700/70">
            <span><b className="text-berry-900">{cups}</b> vasos vendidos</span>
            {deltaPct !== null && (
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                deltaPct >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600'
              }`}>
                {deltaPct >= 0 ? '↑' : '↓'} {Math.abs(deltaPct)}% vs. ayer
              </span>
            )}
          </div>
        </div>
        <div className="w-full max-w-sm flex-1">
          <GoalProgress
            label="Meta diaria"
            valueLabel={`${money(total)} de ${money(goalMoney)}`}
            pct={goalMoney > 0 ? Math.round((total / goalMoney) * 100) : 0}
          />
        </div>
      </div>
    </div>
  )
}
