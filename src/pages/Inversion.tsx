import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import type { Investment } from '../data/types'
import { INVESTORS, investorShares } from '../services/investments'
import { money, round2 } from '../lib/format'
import { Button, Empty } from '../components/ui'
import { BanknoteIcon, ReceiptIcon, WalletIcon } from '../components/ui/icons'
import { CashSummaryCard } from '../features/caja/CashSummaryCard'
import { InvestmentFormSheet } from '../features/inversion/InvestmentFormSheet'
import { InvestorSplit } from '../features/inversion/InvestorSplit'

const payerChip: Record<string, string> = {
  T: 'bg-berry-50 text-berry-500',
  A: 'bg-[var(--chip-choco-bg)] text-[var(--chip-choco-fg)]',
  M: 'bg-[var(--chip-leaf-bg)] text-[var(--chip-leaf-fg)]',
}

type PersonFilter = 'todos' | 'T' | 'A' | 'M' | 'sin'
type EstadoFilter = 'todos' | 'pendiente' | 'liquidado'

export default function Inversion() {
  const investments = useLiveQuery(() => db.investments.orderBy('ts').toArray())
  const [editing, setEditing] = useState<Investment | 'new' | null>(null)
  const [person, setPerson] = useState<PersonFilter>('todos')
  const [estado, setEstado] = useState<EstadoFilter>('todos')
  const [porMonto, setPorMonto] = useState(false)

  const totals = useMemo(() => {
    if (!investments) return null
    const total = round2(investments.reduce((s, i) => s + i.amount, 0))
    const pending = round2(investments.reduce((s, i) => s + i.pending, 0))
    return { total, pending, paid: round2(total - pending) }
  }, [investments])

  const shares = useMemo(() => (investments ? investorShares(investments) : null), [investments])

  const visibles = useMemo(() => {
    if (!investments) return []
    let list = investments.filter(inv => {
      if (person === 'sin' && inv.paidBy !== '') return false
      if (person !== 'todos' && person !== 'sin' && !inv.paidBy.includes(person)) return false
      if (estado === 'pendiente' && inv.pending <= 0) return false
      if (estado === 'liquidado' && inv.pending > 0) return false
      return true
    })
    if (porMonto) list = [...list].sort((a, b) => b.amount - a.amount)
    return list
  }, [investments, person, estado, porMonto])

  if (!investments || !totals || !shares) return null

  const visTotal = round2(visibles.reduce((s, i) => s + i.amount, 0))
  const filtered = person !== 'todos' || estado !== 'todos'

  const personTabs: { id: PersonFilter; label: string }[] = [
    { id: 'todos', label: 'Todos' },
    { id: 'T', label: 'Tania' },
    { id: 'A', label: 'Angel' },
    { id: 'M', label: 'Monse' },
    { id: 'sin', label: 'Sin asignar' },
  ]
  const estadoTabs: { id: EstadoFilter; label: string }[] = [
    { id: 'todos', label: 'Todo' },
    { id: 'pendiente', label: 'Con saldo' },
    { id: 'liquidado', label: 'Liquidados' },
  ]

  return (
    <div className="mx-auto max-w-4xl pt-2 lg:pt-0">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Inversión</h1>
          <p className="mt-0.5 text-sm text-berry-700/60">Todo lo gastado para abrir Frésia</p>
        </div>
        <Button className="px-5 py-2.5 text-sm" onClick={() => setEditing('new')}>+ Nuevo gasto</Button>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <CashSummaryCard icon={ReceiptIcon} label="Inversión total" value={money(totals.total)} hint={`${investments.length} gastos registrados`} />
        <CashSummaryCard icon={BanknoteIcon} label="Ya pagado" value={money(totals.paid)} />
        <CashSummaryCard icon={WalletIcon} label="Resta por pagar" value={money(totals.pending)} hint={totals.pending > 0 ? 'pendiente de liquidar' : 'todo liquidado'} />
      </div>

      <div className="mb-6">
        <InvestorSplit shares={shares} />
      </div>

      {/* filtros */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {personTabs.map(t => (
          <button
            key={t.id}
            onClick={() => setPerson(t.id)}
            className={`rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-colors ${
              person === t.id ? 'border-berry-500 bg-berry-500 text-white' : 'border-cream-300 bg-cream-50 text-berry-900/70'
            }`}
          >
            {t.label}
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-cream-300" />
        {estadoTabs.map(t => (
          <button
            key={t.id}
            onClick={() => setEstado(t.id)}
            className={`rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-colors ${
              estado === t.id ? 'border-berry-500 bg-berry-500 text-white' : 'border-cream-300 bg-cream-50 text-berry-900/70'
            }`}
          >
            {t.label}
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-cream-300" />
        <button
          onClick={() => setPorMonto(v => !v)}
          className={`rounded-full border px-3.5 py-2 text-[13px] font-semibold transition-colors ${
            porMonto ? 'border-berry-500 bg-berry-500 text-white' : 'border-cream-300 bg-cream-50 text-berry-900/70'
          }`}
        >
          Mayor monto
        </button>
      </div>

      {filtered && (
        <p className="mb-3 text-sm text-berry-700/60">
          Mostrando <b>{visibles.length}</b> {visibles.length === 1 ? 'gasto' : 'gastos'} · {money(visTotal)}
        </p>
      )}

      {visibles.length === 0 && <Empty text={filtered ? 'Ningún gasto coincide con el filtro.' : 'Registra los gastos de apertura del negocio.'} />}

      <div className="space-y-2 pb-4">
        {visibles.map(inv => {
          const paidPct = inv.amount > 0 ? Math.round(((inv.amount - inv.pending) / inv.amount) * 100) : 100
          return (
            <button
              key={inv.id}
              onClick={() => setEditing(inv)}
              className="flex w-full items-center gap-3 rounded-2xl border border-cream-200 bg-cream-50 px-5 py-3.5 text-left"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-[15px] font-semibold">{inv.concept}</div>
                {inv.pending > 0 && (
                  <div className="mt-1.5 flex items-center gap-2">
                    <div className="h-1.5 w-28 overflow-hidden rounded-full bg-cream-200">
                      <div className="h-full rounded-full bg-amber-600" style={{ width: `${paidPct}%` }} />
                    </div>
                    <span className="text-xs font-medium text-amber-700">restan {money(inv.pending)}</span>
                  </div>
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
          )
        })}
      </div>

      {editing && (
        <InvestmentFormSheet investment={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />
      )}
    </div>
  )
}
