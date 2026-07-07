import type { StockStatus } from '../../services/analytics'
import { round2 } from '../../lib/format'

const styles = {
  critico: { card: 'border-red-600/25 bg-red-50', bar: 'bg-red-600', label: 'Comprar hoy', text: 'text-red-700' },
  bajo: { card: 'border-amber-600/25 bg-amber-50', bar: 'bg-amber-600', label: 'Comprar pronto', text: 'text-amber-800' },
  ok: { card: 'border-cream-200 bg-cream-50', bar: 'bg-green-600', label: 'En orden', text: 'text-green-700' },
}

/** card pequeña de un insumo con su nivel de stock (rojo/ámbar/verde) */
export function StockCard({ status }: { status: StockStatus }) {
  const s = styles[status.level]
  const i = status.ingredient
  return (
    <div className={`rounded-2xl border p-4 ${s.card}`}>
      <div className="mb-1 truncate text-sm font-semibold">{i.name}</div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="font-display text-xl font-bold tabular-nums">{status.pct}%</span>
        <span className={`text-[11px] font-bold uppercase tracking-wide ${s.text}`}>{s.label}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-cream-200/70">
        <div className={`h-full rounded-full ${s.bar}`} style={{ width: `${status.pct}%` }} />
      </div>
      <div className="mt-1.5 text-xs text-berry-700/55">
        Quedan {round2(i.stock)} {i.unit} · mín. {i.minStock} {i.unit}
      </div>
    </div>
  )
}
