import type { LineShare } from '../../services/analytics'
import { money } from '../../lib/format'

const colors: Record<LineShare['line'], string> = {
  'Clásica': 'var(--color-berry-500)',
  'Chocolate': 'var(--line-choco)',
  'Balance': 'var(--line-olive)',
}

/** ventas por línea con porcentaje y barra horizontal */
export function SalesCard({ lines }: { lines: LineShare[] }) {
  return (
    <div className="rounded-3xl border border-cream-200 bg-cream-50 p-6">
      <h2 className="mb-5 text-xl font-semibold">Ventas por línea</h2>
      <div className="space-y-5">
        {lines.map(l => (
          <div key={l.line}>
            <div className="mb-1.5 flex items-baseline justify-between text-sm">
              <span className="font-medium">{l.line}</span>
              <span className="tabular-nums text-berry-700/70">
                <b className="text-berry-900">{l.pct}%</b> · {money(l.total)}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-cream-200/80">
              <div className="h-full rounded-full" style={{ width: `${l.pct}%`, background: colors[l.line] }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
