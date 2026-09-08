import type { Payment } from '../../data/types'
import { lineUnitPrice, type CartLine } from '../../services/sales'
import { PAYMENT_LABEL } from '../../services/ticket'
import { money } from '../../lib/format'
import { Button } from '../../components/ui'

export interface VentaHecha {
  saleId: string
  lines: CartLine[]
  total: number
  payment: Payment
  /** con cuánto pagaron en efectivo */
  paid?: number
  change?: number
  ticketError?: string
}

/** resumen de la venta recién cobrada: qué se llevó, cómo pagó y cuánto se le devuelve */
export function VentaResumen({ venta, onUndo, onClose }: { venta: VentaHecha; onUndo: () => void; onClose: () => void }) {
  const count = venta.lines.reduce((s, l) => s + l.qty, 0)
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-14 lg:items-center lg:pt-4">
      <div className="absolute inset-0" onClick={onClose} />
      <div className="relative flex max-h-[85dvh] w-full max-w-sm flex-col overflow-hidden rounded-3xl border border-green-600/25 bg-cream-50 shadow-2xl">
        <div className="px-6 pt-5 text-center">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-xl text-green-700">✓</div>
          <div className="font-display text-3xl font-bold tabular-nums">{money(venta.total)}</div>
          <div className="mt-0.5 text-sm text-berry-700/60">
            Venta registrada · {count} {count === 1 ? 'artículo' : 'artículos'} · {PAYMENT_LABEL[venta.payment]}
          </div>
        </div>

        <div className="mx-6 mt-4 flex-1 overflow-y-auto border-t border-cream-200 pt-3">
          <div className="space-y-2.5">
            {venta.lines.map((l, i) => {
              const detalle = [...l.toppings.map(t => t.name), ...l.extras.map(e => `+ ${e.name}`)]
              return (
                <div key={i} className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">
                      {l.qty > 1 && <span className="mr-1.5 text-berry-500 tabular-nums">{l.qty}×</span>}
                      {l.product.name}
                    </div>
                    {detalle.length > 0 && <div className="text-xs text-berry-700/60">{detalle.join(', ')}</div>}
                  </div>
                  <div className="shrink-0 text-sm font-bold tabular-nums">{money(lineUnitPrice(l) * l.qty)}</div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="px-6 pb-5 pt-3">
          {venta.payment === 'efectivo' && venta.paid != null && (
            <div className="flex items-center justify-between rounded-xl bg-berry-50 px-4 py-2.5 text-berry-700">
              <div className="text-sm">
                <span className="text-berry-700/60">Recibido </span>
                <span className="font-semibold tabular-nums">{money(venta.paid)}</span>
              </div>
              {venta.change != null && (
                <div>
                  <span className="text-sm font-medium">Cambio </span>
                  <span className="font-display text-lg font-bold tabular-nums">{money(venta.change)}</span>
                </div>
              )}
            </div>
          )}
          {venta.ticketError && (
            <div className="mt-2 rounded-xl bg-red-50 px-3 py-1.5 text-xs text-red-700">
              No se imprimió el ticket: {venta.ticketError}
            </div>
          )}
          <div className="mt-2 text-center font-display text-sm italic text-berry-700/45">Para mi bombón.</div>
          <div className="mt-3 flex gap-2">
            <button
              onClick={onUndo}
              className="rounded-full border border-cream-300 px-4 py-2.5 text-sm font-semibold text-berry-700 active:bg-cream-100"
            >
              Deshacer
            </button>
            <Button className="flex-1" onClick={onClose}>Listo</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
