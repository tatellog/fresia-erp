import type { CartLine } from '../../services/sales'
import { money } from '../../lib/format'
import { Stepper } from '../../components/ui'

/** renglones del ticket con control de cantidad */
export function CartLines({ lines, setQty }: { lines: CartLine[]; setQty: (id: string, qty: number) => void }) {
  return (
    <div className="mb-4 space-y-2">
      {lines.map(l => (
        <div key={l.product.id} className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{l.product.name}</div>
            <div className="text-xs text-berry-700/60">{money(l.product.price)} c/u</div>
          </div>
          <Stepper value={l.qty} onChange={q => setQty(l.product.id, q)} />
          <div className="w-16 text-right text-sm font-bold tabular-nums">{money(l.product.price * l.qty)}</div>
        </div>
      ))}
    </div>
  )
}
