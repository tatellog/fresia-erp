import { money } from '../../lib/format'

/** utilidad del día: ingresos, costo y utilidad con barras comparables */
export function ProfitCard({ income, cost, profit, costsKnown }: {
  income: number
  cost: number
  profit: number
  costsKnown: boolean
}) {
  const rows = [
    { label: 'Ingresos', value: income, color: 'var(--color-berry-500)' },
    { label: 'Costo', value: cost, color: 'var(--line-choco)' },
    { label: 'Utilidad', value: profit, color: 'var(--line-olive)' },
  ]
  const max = Math.max(income, 1)
  return (
    <div className="rounded-3xl border border-cream-200 bg-cream-50 p-6">
      <h2 className="mb-5 text-xl font-semibold">Utilidad de hoy</h2>
      {!costsKnown && (
        <p className="mb-4 rounded-xl bg-cream-200/60 px-3 py-2 text-xs text-berry-700/70">
          Registra compras de insumos para que el costo y la utilidad sean reales.
        </p>
      )}
      <div className="space-y-4">
        {rows.map(r => (
          <div key={r.label}>
            <div className="mb-1.5 flex justify-between text-sm">
              <span className="font-medium">{r.label}</span>
              <span className="font-semibold tabular-nums">{money(r.value)}</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-cream-200/80">
              <div className="h-full rounded-full" style={{ width: `${Math.max(0, (r.value / max) * 100)}%`, background: r.color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
