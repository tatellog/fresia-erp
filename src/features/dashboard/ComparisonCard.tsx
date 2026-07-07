import { money } from '../../lib/format'
import { delta } from '../../services/analytics'

/** comparación de hoy contra ayer y contra hace una semana */
export function ComparisonCard({ today, yesterday, weekAgo }: {
  today: number
  yesterday: number
  weekAgo: number
}) {
  const rows = [
    { label: 'Hoy', value: today, d: null as number | null },
    { label: 'Ayer', value: yesterday, d: delta(today, yesterday) },
    { label: 'Hace una semana', value: weekAgo, d: delta(today, weekAgo) },
  ]
  const max = Math.max(today, yesterday, weekAgo, 1)
  return (
    <div className="rounded-3xl border border-cream-200 bg-cream-50 p-6">
      <h2 className="mb-5 text-xl font-semibold">Comparación</h2>
      <div className="space-y-4">
        {rows.map(r => (
          <div key={r.label}>
            <div className="mb-1.5 flex items-center justify-between text-sm">
              <span className="font-medium">{r.label}</span>
              <span className="flex items-center gap-2">
                <b className="tabular-nums">{money(r.value)}</b>
                {r.d !== null && (
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    r.d >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600'
                  }`}>
                    {r.d >= 0 ? '↑' : '↓'} {Math.abs(r.d)}%
                  </span>
                )}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-cream-200/80">
              <div
                className={`h-full rounded-full ${r.label === 'Hoy' ? 'bg-berry-500' : 'bg-[var(--color-blush)]'}`}
                style={{ width: `${(r.value / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
