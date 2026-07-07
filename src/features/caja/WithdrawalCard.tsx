import type { Expense } from '../../data/types'
import { fmtTime, money } from '../../lib/format'
import { Button } from '../../components/ui'

/** retiros de efectivo del turno (a banco o caja fuerte) */
export function WithdrawalCard({ withdrawals, onAdd, canAdd }: { withdrawals: Expense[]; onAdd: () => void; canAdd: boolean }) {
  return (
    <div className="flex flex-col rounded-3xl border border-cream-200 bg-cream-50 p-6">
      <h2 className="mb-4 text-xl font-semibold">Retiros</h2>
      {withdrawals.length === 0 ? (
        <p className="flex-1 py-4 text-sm text-berry-700/50">Sin retiros en este turno. Retira efectivo cuando la caja acumule más de lo necesario.</p>
      ) : (
        <div className="flex-1 space-y-0">
          {withdrawals.map((w, i) => (
            <div key={w.id} className={`flex items-center justify-between py-3 ${i > 0 ? 'border-t border-cream-200/70' : ''}`}>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-medium">{w.concept}</div>
                <div className="text-xs text-berry-700/50">{fmtTime(w.ts)}</div>
              </div>
              <span className="font-semibold tabular-nums text-red-600">−{money(w.amount)}</span>
            </div>
          ))}
        </div>
      )}
      <Button variant="soft" className="mt-4 w-full" onClick={onAdd} disabled={!canAdd}>
        Retiro de efectivo
      </Button>
    </div>
  )
}
