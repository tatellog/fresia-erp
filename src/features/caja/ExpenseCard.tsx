import type { Expense } from '../../data/types'
import { fmtTime, money } from '../../lib/format'
import { Button } from '../../components/ui'

/** gastos operativos del turno */
export function ExpenseCard({ expenses, onAdd, canAdd }: { expenses: Expense[]; onAdd: () => void; canAdd: boolean }) {
  return (
    <div className="flex flex-col rounded-3xl border border-cream-200 bg-cream-50 p-6">
      <h2 className="mb-4 text-xl font-semibold">Gastos de hoy</h2>
      {expenses.length === 0 ? (
        <p className="flex-1 py-4 text-sm text-berry-700/50">Sin gastos en este turno.</p>
      ) : (
        <div className="flex-1 space-y-0">
          {expenses.map((e, i) => (
            <div key={e.id} className={`flex items-center justify-between py-3 ${i > 0 ? 'border-t border-cream-200/70' : ''}`}>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-medium">{e.concept}</div>
                <div className="text-xs text-berry-700/50">{fmtTime(e.ts)}</div>
              </div>
              <span className="font-semibold tabular-nums text-red-600">−{money(e.amount)}</span>
            </div>
          ))}
        </div>
      )}
      <Button variant="soft" className="mt-4 w-full" onClick={onAdd} disabled={!canAdd}>
        Registrar gasto
      </Button>
    </div>
  )
}
