import { lineUnitPrice, type CartLine } from '../../services/sales'
import { money } from '../../lib/format'
import { Stepper } from '../../components/ui'

/** renglones del ticket con toppings y control de cantidad */
export function CartLines({ lines, setQty }: { lines: CartLine[]; setQty: (index: number, qty: number) => void }) {
  return (
    <div className="mb-4 space-y-2">
      {lines.map((l, i) => {
        const unit = lineUnitPrice(l)
        return (
          <div key={i} className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{l.product.name}</div>
              {l.toppings.length > 0 && (
                <div className="truncate text-xs text-berry-700/60">{l.toppings.map(t => t.name).join(', ')}</div>
              )}
              <div className="text-xs text-berry-700/60">{money(unit)} c/u</div>
            </div>
            <Stepper value={l.qty} onChange={q => setQty(i, q)} />
            <div className="w-16 text-right text-sm font-bold tabular-nums">{money(unit * l.qty)}</div>
          </div>
        )
      })}
    </div>
  )
}
