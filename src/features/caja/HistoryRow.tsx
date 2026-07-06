import type { CashSession } from '../../data/types'
import { fmtDateTime, money, round2 } from '../../lib/format'

/** renglón del historial de cortes: contado vs. esperado */
export function HistoryRow({ s }: { s: CashSession }) {
  const diff = round2((s.closeAmount ?? 0) - (s.expected ?? 0))
  return (
    <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm">
      <span className="text-berry-700/70">{fmtDateTime(s.openTs)}</span>
      <span className="tabular-nums">
        contado <b>{money(s.closeAmount ?? 0)}</b>{' '}
        {diff === 0 ? (
          <span className="text-green-700">✓ exacto</span>
        ) : (
          <span className={diff > 0 ? 'text-green-700' : 'text-red-600'}>
            {diff > 0 ? 'sobró' : 'faltó'} {money(Math.abs(diff))}
          </span>
        )}
      </span>
    </div>
  )
}
