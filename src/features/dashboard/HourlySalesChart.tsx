import { money } from '../../lib/format'

const fmtHour = (h: number) => {
  const doce = h % 12 === 0 ? 12 : h % 12
  return `${doce} ${h < 12 ? 'am' : 'pm'}`
}

/** horas pico: cuándo se vende más (para saber cuándo se necesita más personal) */
export function HourlySalesChart({ hours, subtitle }: {
  hours: { hour: number; total: number; tickets: number }[]
  subtitle: string
}) {
  const visibles = hours.filter(h => h.hour >= 9 && h.hour <= 21)
  const max = Math.max(...visibles.map(h => h.total), 1)
  return (
    <div className="rounded-3xl border border-cream-200 bg-cream-50 p-6">
      <h2 className="text-xl font-semibold">Horas pico</h2>
      <p className="mb-5 mt-0.5 text-xs text-berry-700/55">{subtitle}</p>
      <div className="space-y-2.5">
        {visibles.map(h => (
          <div key={h.hour} className="flex items-center gap-3">
            <span className="w-12 shrink-0 text-xs tabular-nums text-berry-700/60">{fmtHour(h.hour)}</span>
            <div className="h-4 flex-1 overflow-hidden rounded-md bg-cream-200/60">
              <div
                className={`h-full rounded-md ${h.total === max && h.total > 0 ? 'bg-berry-500' : 'bg-[var(--color-blush)]'}`}
                style={{ width: `${(h.total / max) * 100}%` }}
              />
            </div>
            <span className="w-16 shrink-0 text-right text-xs tabular-nums text-berry-700/60">
              {h.total > 0 ? money(h.total) : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
