import type { Expense, Payment, Sale } from '../../data/types'
import { RECON_ID } from '../../services/history'
import { salesSummary } from '../../services/analytics'
import { fmtTime, money, round2 } from '../../lib/format'

const PAGOS: { id: Payment; label: string }[] = [
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'tarjeta', label: 'Tarjeta' },
  { id: 'transferencia', label: 'Transferencia' },
  { id: 'rappi', label: 'Rappi' },
  { id: 'didi', label: 'DiDi' },
  { id: 'uber', label: 'Uber Eats' },
]

const esReconstruida = (s: Sale) => s.items[0]?.productId === RECON_ID

/** todo lo que pasó un día: totales, formas de pago, ventas una por una, gastos y retiros */
export function DiaDetalle({ dayStart, sales, expenses, onOpenSale }: {
  dayStart: number
  sales: Sale[]
  expenses: Expense[]
  onOpenSale: (s: Sale) => void
}) {
  const resumen = salesSummary(sales)
  const porPago = PAGOS
    .map(p => ({ ...p, monto: round2(sales.filter(s => s.payment === p.id).reduce((a, s) => a + s.total, 0)) }))
    .filter(p => p.monto > 0)
  const ordenadas = [...sales].sort((a, b) => a.ts - b.ts)
  const gastos = expenses.filter(e => (e.kind ?? 'gasto') === 'gasto')
  const retiros = expenses.filter(e => e.kind === 'retiro')
  const fecha = new Date(dayStart).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="rounded-2xl border border-berry-200 bg-berry-50/70 p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-berry-500">{fecha}</div>
          <div className="mt-1 font-display text-[40px] font-bold leading-none tabular-nums">{money(resumen.total)}</div>
          <div className="mt-2 text-sm text-berry-700/70">
            <b className="text-berry-900">{resumen.cups}</b> vasos · {resumen.tickets} cobros
            {resumen.tickets > 0 && <> · ticket promedio {money(resumen.avgTicket)}</>}
          </div>
        </div>
        {porPago.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {porPago.map(p => (
              <span key={p.id} className="rounded-full border border-berry-200 bg-cream-50 px-3 py-1 text-xs text-berry-700">
                {p.label} <b className="tabular-nums text-berry-900">{money(p.monto)}</b>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between border-t border-berry-200/70 pt-4">
        <h3 className="text-base font-semibold">Ventas del día</h3>
        {sales.length > 0 && (
          <span className="rounded-full bg-berry-500 px-2.5 py-0.5 text-xs font-bold text-white">{sales.length}</span>
        )}
      </div>

      {sales.length === 0 ? (
        <p className="mt-3 rounded-xl bg-cream-50 px-4 py-5 text-center text-sm text-berry-700/55">
          Ese día no hay ventas registradas.
        </p>
      ) : (
        <div className="mt-2 overflow-hidden rounded-xl bg-cream-50">
          {ordenadas.map((s, i) => {
            const recon = esReconstruida(s)
            const Row = recon ? 'div' : 'button'
            return (
              <Row
                key={s.id}
                onClick={recon ? undefined : () => onOpenSale(s)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left ${i > 0 ? 'border-t border-cream-200/70' : ''} ${
                  recon ? '' : 'cursor-pointer transition-colors hover:bg-cream-100/60 active:bg-cream-100'
                }`}
              >
                <span className="w-12 shrink-0 text-sm tabular-nums text-berry-700/55">{fmtTime(s.ts)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium">
                    {recon ? 'Corte en papel' : s.items.map(it => `${it.qty}× ${it.name}`).join(', ')}
                  </span>
                  {s.employeeName && <span className="block text-xs text-berry-700/50">atendió {s.employeeName}</span>}
                </span>
                <span className="rounded-full bg-cream-200/70 px-2.5 py-0.5 text-xs capitalize text-berry-700/70">{s.payment}</span>
                <span className="w-20 shrink-0 text-right font-semibold tabular-nums text-green-700">{money(s.total)}</span>
              </Row>
            )
          })}
        </div>
      )}

      {(gastos.length > 0 || retiros.length > 0) && (
        <div className="mt-5">
          <h3 className="mb-2 text-base font-semibold">Gastos y retiros</h3>
          <div className="overflow-hidden rounded-xl bg-cream-50">
          {[...gastos, ...retiros].sort((a, b) => a.ts - b.ts).map((e, i) => (
            <div key={e.id} className={`flex items-center gap-3 px-4 py-2.5 ${i > 0 ? 'border-t border-cream-200/70' : ''}`}>
              <span className="w-12 shrink-0 text-sm tabular-nums text-berry-700/55">{fmtTime(e.ts)}</span>
              <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{e.concept}</span>
              <span className="rounded-full bg-cream-200/70 px-2.5 py-0.5 text-xs text-berry-700/70">{e.kind === 'retiro' ? 'retiro' : 'gasto'}</span>
              <span className="w-20 shrink-0 text-right font-semibold tabular-nums text-red-600">−{money(e.amount)}</span>
            </div>
          ))}
          </div>
        </div>
      )}
    </div>
  )
}
