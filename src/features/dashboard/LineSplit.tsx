import { money } from '../../lib/format'

export interface LineTotal {
  label: string
  total: number
  color: string
}

/** barras horizontales Clásica / Balance / Extras con etiqueta directa */
export function LineSplit({ lines }: { lines: LineTotal[] }) {
  const max = Math.max(...lines.map(l => l.total), 1)
  return (
    <div className="space-y-2.5">
      {lines.map(l => (
        <div key={l.label} className="flex items-center gap-3">
          <span className="w-16 shrink-0 text-[11px] font-semibold uppercase tracking-[0.14em] text-berry-900/55">
            {l.label}
          </span>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-cream-200/70">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${(l.total / max) * 100}%`, background: l.color }}
            />
          </div>
          <span className="w-20 shrink-0 text-right text-sm font-semibold tabular-nums">{money(l.total)}</span>
        </div>
      ))}
    </div>
  )
}
