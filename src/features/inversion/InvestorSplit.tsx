import { INVESTORS } from '../../services/investments'
import { money } from '../../lib/format'

const colors: Record<string, string> = {
  T: 'var(--color-berry-500)',
  A: 'var(--line-choco)',
  M: 'var(--line-olive)',
  sin: 'var(--color-cream-300)',
}

/** barra de distribución: cuánto ha aportado cada persona de lo ya pagado */
export function InvestorSplit({ shares }: { shares: Record<string, number> }) {
  const total = Object.values(shares).reduce((a, b) => a + b, 0)
  if (total <= 0) return null
  const entries = Object.entries(shares).filter(([, v]) => v > 0)
  return (
    <div className="rounded-3xl border border-cream-200 bg-cream-50 p-6">
      <h2 className="mb-4 text-xl font-semibold">Aportaciones</h2>
      <div className="mb-4 flex h-4 overflow-hidden rounded-full">
        {entries.map(([k, v]) => (
          <div key={k} style={{ width: `${(v / total) * 100}%`, background: colors[k] }} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {entries.map(([k, v]) => (
          <div key={k} className="flex items-center gap-2.5">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: colors[k] }} />
            <div className="min-w-0">
              <div className="text-xs font-medium text-berry-700/60">{INVESTORS[k] ?? 'Sin asignar'}</div>
              <div className="font-display text-lg font-bold tabular-nums">{money(v)}</div>
              <div className="text-[11px] text-berry-700/50">{Math.round((v / total) * 100)}% de lo pagado</div>
            </div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-berry-700/45">
        Los gastos compartidos se reparten en partes iguales entre quienes los pagaron.
      </p>
    </div>
  )
}
