import type { LineShare } from '../../services/analytics'
import { money } from '../../lib/format'

const colors: Record<LineShare['line'], string> = {
  'Del mes': 'var(--line-nogada)',
  'Clásica': 'var(--color-berry-500)',
  'Uvas': 'var(--line-uva)',
  'Mix': 'var(--line-mix)',
  'Granada': 'var(--line-granada)',
  'Balance': 'var(--line-olive)',
  'Choco Crema': 'var(--line-choco)',
  'Brûlée': 'var(--line-brulee)',
  'Waffle': 'var(--line-waffle)',
  'Bebidas': 'var(--line-te)',
  'Pan de muerto': 'var(--line-pan)',
  'Despensa': 'var(--line-miel)',
  'Otros': 'var(--color-blush)',
}

/** ventas por línea con porcentaje y barra horizontal */
export function SalesCard({ lines }: { lines: LineShare[] }) {
  return (
    <div className="rounded-3xl border border-cream-200 bg-cream-50 p-6">
      <h2 className="mb-5 text-xl font-semibold">Ventas por línea</h2>
      <div className="space-y-5">
        {/* solo las líneas que vendieron: con temporada y extras ya son muchas */}
        {lines.every(l => l.total === 0) && <p className="text-sm text-berry-700/50">Aún no hay ventas en este periodo.</p>}
        {lines.filter(l => l.total > 0).map(l => (
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
