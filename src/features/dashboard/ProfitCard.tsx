import { money } from '../../lib/format'

/** ganancia del día: ingresos, costo de insumos y ganancia con barras comparables */
export function ProfitCard({ income, cost, profit, costsKnown }: {
  income: number
  cost: number
  profit: number
  costsKnown: boolean
}) {
  const rows = [
    { label: 'Ingresos', value: income, color: 'var(--color-berry-500)' },
    { label: 'Costo de insumos', value: cost, color: 'var(--line-choco)' },
    { label: 'Ganancia', value: profit, color: 'var(--line-olive)' },
  ]
  const max = Math.max(income, 1)
  const margin = income > 0 ? Math.round((profit / income) * 100) : 0
  return (
    <div className="rounded-3xl border border-cream-200 bg-cream-50 p-6">
      <div className="mb-5 flex items-baseline justify-between">
        <h2 className="text-xl font-semibold">Ganancia de hoy</h2>
        {costsKnown && income > 0 && (
          <span className="text-sm font-bold text-green-700">{margin}% de margen</span>
        )}
      </div>
      {!costsKnown && (
        <p className="mb-4 rounded-xl bg-cream-200/60 px-3 py-2 text-xs text-berry-700/70">
          Registra compras de insumos para que el costo y la ganancia sean reales.
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
      <p className="mt-4 text-xs text-berry-700/50">
        Ganancia bruta: no incluye gastos del turno (hielo, gasolina…); esos se ven en Caja.
      </p>
    </div>
  )
}
