import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import type { Expense } from '../../data/types'
import { fmtTime, money } from '../../lib/format'
import { fmtQty, fmtUnitCost } from '../../services/units'
import { Button, Sheet } from '../../components/ui'

const PAGO: Record<string, string> = { efectivo: 'Efectivo de la caja', tarjeta: 'Tarjeta', transferencia: 'Transferencia' }

/**
 * Detalle de un gasto o retiro del historial. Si salió de una compra de
 * insumos muestra cada renglón: la compra y su gasto se guardan con la
 * misma hora exacta, así se encuentran.
 */
export function GastoSheet({ expense, onClose }: { expense: Expense; onClose: () => void }) {
  const retiro = expense.kind === 'retiro'
  const compra = useLiveQuery(async () => {
    if (retiro) return []
    const lines = await db.purchases.where('ts').equals(expense.ts).toArray()
    const ings = await db.ingredients.bulkGet(lines.map(l => l.ingredientId))
    return lines.map((l, i) => ({ ...l, unit: ings[i]?.unit }))
  }, [expense.id])
  const turno = useLiveQuery(() => (expense.sessionId ? db.cashSessions.get(expense.sessionId) : undefined), [expense.sessionId])

  const proveedor = compra?.find(l => l.supplier)?.supplier
  const nota = compra?.find(l => l.note)?.note

  return (
    <Sheet open onClose={onClose} title={`${retiro ? 'Retiro' : 'Gasto'} de las ${fmtTime(expense.ts)}`}>
      <p className="mb-4 text-[15px] font-medium">{expense.concept}</p>

      {!!compra?.length && (
        <div className="mb-4 space-y-2.5">
          {compra.map(l => (
            <div key={l.id} className="flex items-baseline justify-between gap-3 text-[15px]">
              <div className="min-w-0">
                <span className="font-medium">{l.ingredientName}</span>
                {l.unit && (
                  <div className="text-xs text-berry-700/55">
                    {fmtQty(l.qty, l.unit)}
                    {l.qty > 0 && <> · {fmtUnitCost(l.totalCost / l.qty, l.unit)}</>}
                  </div>
                )}
              </div>
              <span className="shrink-0 font-medium tabular-nums">{money(l.totalCost)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="mb-4 flex items-baseline justify-between border-t border-cream-200 pt-3.5">
        <span className="text-sm font-medium text-berry-700/70">Total</span>
        <span className="font-display text-[26px] font-bold tabular-nums">{money(expense.amount)}</span>
      </div>

      <div className="mb-5 space-y-1.5 text-sm text-berry-700/70">
        {!retiro && (
          <div className="flex justify-between gap-3"><span>Se pagó con</span><span className="text-berry-900">{PAGO[expense.payment ?? 'efectivo']}</span></div>
        )}
        {proveedor && <div className="flex justify-between gap-3"><span>Dónde se compró</span><span className="text-berry-900">{proveedor}</span></div>}
        {turno?.employeeName && <div className="flex justify-between gap-3"><span>Turno de</span><span className="text-berry-900">{turno.employeeName}</span></div>}
        {nota && <div className="flex justify-between gap-3"><span>Nota</span><span className="text-right text-berry-900">{nota}</span></div>}
        {!retiro && (expense.payment ?? 'efectivo') !== 'efectivo' && (
          <p className="pt-1 text-xs text-berry-700/50">No salió de la caja, así que no baja el efectivo del corte.</p>
        )}
      </div>

      <Button className="w-full" onClick={onClose}>Cerrar</Button>
    </Sheet>
  )
}
