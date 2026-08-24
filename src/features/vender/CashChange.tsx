import { money, round2 } from '../../lib/format'
import { Input } from '../../components/ui'

/** montos rápidos: pago exacto y los redondeos a billete más probables */
const sugeridos = (total: number) =>
  [...new Set([50, 100, 200, 500].map(b => Math.ceil(total / b) * b).filter(v => v > total))].slice(0, 3)

/** en pagos en efectivo: con cuánto pagan y cuánto dar de cambio */
export function CashChange({ total, paid, setPaid }: {
  total: number
  paid: number | null
  setPaid: (v: number | null) => void
}) {
  const change = paid != null ? round2(paid - total) : null
  return (
    <div className="mb-4">
      <p className="mb-1.5 text-sm font-medium text-berry-700/70">¿Con cuánto pagan?</p>
      <div className="flex gap-2">
        <button
          onClick={() => setPaid(paid === total ? null : total)}
          className={`rounded-full border px-3 py-2 text-[13px] font-medium tracking-wide transition-colors ${
            paid === total ? 'border-berry-500 bg-berry-500 text-white' : 'border-cream-300 text-berry-700'
          }`}
        >
          Exacto
        </button>
        {sugeridos(total).map(v => (
          <button
            key={v}
            onClick={() => setPaid(paid === v ? null : v)}
            className={`rounded-full border px-3 py-2 text-[13px] font-medium tabular-nums tracking-wide transition-colors ${
              paid === v ? 'border-berry-500 bg-berry-500 text-white' : 'border-cream-300 text-berry-700'
            }`}
          >
            {money(v)}
          </button>
        ))}
        <Input
          type="number"
          inputMode="decimal"
          min={0}
          placeholder="Otro"
          className="min-w-0 flex-1 text-center tabular-nums"
          value={paid ?? ''}
          onChange={e => {
            const v = parseFloat(e.target.value)
            setPaid(Number.isFinite(v) ? v : null)
          }}
        />
      </div>
      {change != null && change !== 0 && (
        <div
          className={`mt-2 flex items-baseline justify-between rounded-xl px-4 py-2.5 ${
            change > 0 ? 'bg-cream-200' : 'bg-red-50 text-red-700'
          }`}
        >
          <span className="text-sm font-medium">{change > 0 ? 'Cambio a devolver' : 'Falta'}</span>
          <span className="font-display text-xl font-bold tabular-nums">{money(Math.abs(change))}</span>
        </div>
      )}
    </div>
  )
}
