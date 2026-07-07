import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import type { Investment } from '../data/types'
import { INVESTORS } from '../services/investments'
import { money, round2 } from '../lib/format'
import { Button, Empty } from '../components/ui'
import { BanknoteIcon, ReceiptIcon, WalletIcon } from '../components/ui/icons'
import { CashSummaryCard } from '../features/caja/CashSummaryCard'
import { InvestmentFormSheet } from '../features/inversion/InvestmentFormSheet'

const payerChip: Record<string, string> = {
  T: 'bg-berry-50 text-berry-500',
  A: 'bg-[var(--chip-choco-bg)] text-[var(--chip-choco-fg)]',
  M: 'bg-[var(--chip-leaf-bg)] text-[var(--chip-leaf-fg)]',
}

export default function Inversion() {
  const investments = useLiveQuery(() => db.investments.orderBy('ts').toArray())
  const [editing, setEditing] = useState<Investment | 'new' | null>(null)

  const totals = useMemo(() => {
    if (!investments) return null
    const total = round2(investments.reduce((s, i) => s + i.amount, 0))
    const pending = round2(investments.reduce((s, i) => s + i.pending, 0))
    return { total, pending, paid: round2(total - pending) }
  }, [investments])

  if (!investments || !totals) return null

  return (
    <div className="mx-auto max-w-4xl pt-2 lg:pt-0">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Inversión</h1>
          <p className="mt-0.5 text-sm text-berry-700/60">
            Todo lo gastado para abrir Frésia · {Object.entries(INVESTORS).map(([i, n]) => `${i} = ${n}`).join(' · ')}
          </p>
        </div>
        <Button variant="soft" className="px-4 py-2.5 text-sm" onClick={() => setEditing('new')}>+ Nuevo gasto</Button>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <CashSummaryCard icon={ReceiptIcon} label="Inversión total" value={money(totals.total)} hint={`${investments.length} gastos registrados`} />
        <CashSummaryCard icon={BanknoteIcon} label="Ya pagado" value={money(totals.paid)} />
        <CashSummaryCard icon={WalletIcon} label="Resta por pagar" value={money(totals.pending)} hint={totals.pending > 0 ? 'pendiente de liquidar' : 'todo liquidado'} />
      </div>

      {investments.length === 0 && <Empty text="Registra los gastos de apertura del negocio." />}

      <div className="space-y-2 pb-4">
        {investments.map(inv => (
          <button
            key={inv.id}
            onClick={() => setEditing(inv)}
            className="flex w-full items-center gap-3 rounded-2xl border border-cream-200 bg-cream-50 px-5 py-3.5 text-left"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-semibold">{inv.concept}</div>
              {inv.pending > 0 && (
                <div className="mt-0.5 text-xs font-medium text-amber-700">Restan {money(inv.pending)} por pagar</div>
              )}
            </div>
            <div className="flex shrink-0 gap-1">
              {inv.paidBy.split('').map(ini => (
                <span key={ini} title={INVESTORS[ini]} className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${payerChip[ini] ?? 'bg-cream-200 text-berry-700'}`}>
                  {ini}
                </span>
              ))}
              {!inv.paidBy && <span className="text-xs text-berry-700/40">sin asignar</span>}
            </div>
            <div className="w-28 shrink-0 text-right font-display text-lg font-bold tabular-nums">
              {inv.amount > 0 ? money(inv.amount) : '·'}
            </div>
          </button>
        ))}
      </div>

      {editing && (
        <InvestmentFormSheet investment={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}
