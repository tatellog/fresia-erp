import { lineUnitPrice, type CartLine } from '../../services/sales'
import { money } from '../../lib/format'
import { Stepper } from '../../components/ui'

/** «Arándano, Arándano» se lee mejor como «Arándano ×2» */
function agrupar(nombres: string[]) {
  const cuenta = new Map<string, number>()
  for (const n of nombres) cuenta.set(n, (cuenta.get(n) ?? 0) + 1)
  return [...cuenta].map(([n, c]) => (c > 1 ? `${n} ×${c}` : n))
}

/**
 * Renglones del ticket. El nombre y los toppings van a todo lo ancho y sin
 * cortarse: en el mostrador hay que leerlos completos para preparar el vaso.
 */
export function CartLines({ lines, setQty }: { lines: CartLine[]; setQty: (index: number, qty: number) => void }) {
  return (
    <div className="mb-4 divide-y divide-cream-200">
      {lines.map((l, i) => {
        const unit = lineUnitPrice(l)
        const toppings = agrupar(l.toppings.map(t => t.name))
        const extras = agrupar(l.extras.map(e => e.name))
        return (
          <div key={i} className="py-2.5 first:pt-0 last:pb-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 text-sm font-semibold leading-snug">{l.product.name}</div>
              <div className="shrink-0 text-sm font-bold tabular-nums">{money(unit * l.qty)}</div>
            </div>
            {toppings.length > 0 && (
              <div className="mt-0.5 text-xs leading-snug text-berry-700/70">{toppings.join(' · ')}</div>
            )}
            {extras.length > 0 && (
              <div className="mt-0.5 text-xs leading-snug text-berry-500">+ {extras.join(' · ')}</div>
            )}
            <div className="mt-1.5 flex items-center justify-between">
              <span className="text-xs text-berry-700/50">{money(unit)} c/u</span>
              <Stepper value={l.qty} onChange={q => setQty(i, q)} />
            </div>
          </div>
        )
      })}
    </div>
  )
}
