import type { CashSession } from '../../data/types'
import { fmtDate, fmtTime, money, round2 } from '../../lib/format'

/** renglón del historial de cortes con estado: correcto, con diferencia o pendiente */
export function HistoryRow({ s }: { s: CashSession }) {
  const diff = round2((s.closeAmount ?? 0) - (s.expected ?? 0))
  const estado = diff === 0
    ? { label: 'Todo correcto', cls: 'bg-green-100 text-green-700' }
    : s.note
      ? { label: 'Con diferencia', cls: 'bg-amber-50 text-amber-800' }
      : { label: 'Pendiente', cls: 'bg-red-50 text-red-700' }

  return (
    <div className="flex items-center gap-4 rounded-2xl border border-cream-200 bg-cream-50 px-5 py-4">
      <div className="min-w-0 flex-1">
        <div className="text-[15px] font-semibold">{fmtDate(s.openTs)} · {fmtTime(s.openTs)}</div>
        <div className="text-xs text-berry-700/55">
          {s.employeeName ?? 'Sin empleada asignada'}
          {s.note && <> · {s.note}</>}
        </div>
      </div>
      <div className="text-right">
        <div className="font-semibold tabular-nums">{money(s.closeAmount ?? 0)}</div>
        {diff !== 0 && (
          <div className={`text-xs font-medium tabular-nums ${diff > 0 ? 'text-green-700' : 'text-red-600'}`}>
            {diff > 0 ? '+' : '−'}{money(Math.abs(diff))}
          </div>
        )}
      </div>
      <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${estado.cls}`}>{estado.label}</span>
    </div>
  )
}
