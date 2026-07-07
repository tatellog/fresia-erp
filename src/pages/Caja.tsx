import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import { expectedCash } from '../services/cash'
import { fmtTime, startOfDay } from '../lib/format'
import { Empty } from '../components/ui'
import { ArrowDownCircleIcon, LockIcon, ReceiptIcon, UnlockIcon } from '../components/ui/icons'
import { CashStatusBadge } from '../features/caja/CashStatusBadge'
import { DailyTotals } from '../features/caja/DailyTotals'
import { QuickActionButton } from '../features/caja/QuickActionButton'
import { CashMovementTimeline, type CashMovement } from '../features/caja/CashMovementTimeline'
import { ExpenseCard } from '../features/caja/ExpenseCard'
import { WithdrawalCard } from '../features/caja/WithdrawalCard'
import { CashCountForm } from '../features/caja/CashCountForm'
import { HistoryRow } from '../features/caja/HistoryRow'
import { AbrirSheet } from '../features/caja/AbrirSheet'
import { GastoSheet } from '../features/caja/GastoSheet'
import { RetiroSheet } from '../features/caja/RetiroSheet'

const DIEZ_HORAS = 10 * 3600_000

export default function Caja() {
  // null = caja cerrada; undefined = consulta aún cargando
  const session = useLiveQuery(async () => (await db.cashSessions.filter(s => s.closeTs === undefined).last()) ?? null)
  const sessionSales = useLiveQuery(
    async () => (session ? db.sales.where('sessionId').equals(session.id).toArray() : []),
    [session?.id],
  )
  const sessionExpenses = useLiveQuery(
    async () => (session ? db.expenses.where('sessionId').equals(session.id).toArray() : []),
    [session?.id],
  )
  const todaySales = useLiveQuery(() => db.sales.where('ts').aboveOrEqual(startOfDay(0)).toArray())
  const history = useLiveQuery(() =>
    db.cashSessions.orderBy('openTs').reverse().filter(s => s.closeTs !== undefined).limit(8).toArray(),
  )
  const branch = useLiveQuery(async () => (await db.meta.get('branch'))?.value || 'Principal')
  const [sheet, setSheet] = useState<'abrir' | 'gasto' | 'retiro' | null>(null)

  const gastos = useMemo(() => (sessionExpenses ?? []).filter(e => (e.kind ?? 'gasto') === 'gasto'), [sessionExpenses])
  const retiros = useMemo(() => (sessionExpenses ?? []).filter(e => e.kind === 'retiro'), [sessionExpenses])

  const movements = useMemo<CashMovement[]>(() => {
    if (!session) return []
    const items: CashMovement[] = [
      { ts: session.openTs, label: 'Apertura de caja', amount: session.openAmount, tone: 'info', tag: 'fondo' },
      ...(sessionSales ?? []).map(s => ({
        ts: s.ts,
        label: s.items.map(i => `${i.qty}× ${i.name}`).join(', '),
        amount: s.total,
        tone: 'in' as const,
        tag: s.payment,
      })),
      ...(sessionExpenses ?? []).map(e => ({
        ts: e.ts,
        label: e.concept,
        amount: e.amount,
        tone: 'out' as const,
        tag: e.kind === 'retiro' ? 'retiro' : 'gasto',
      })),
    ]
    return items.sort((a, b) => b.ts - a.ts).slice(0, 30)
  }, [session, sessionSales, sessionExpenses])

  if (session === undefined || !history || !todaySales) return null

  const expected = session ? expectedCash(session, sessionSales ?? [], sessionExpenses ?? []) : 0
  const cardTotal = todaySales.filter(s => s.payment === 'tarjeta').reduce((s, x) => s + x.total, 0)
  const transferTotal = todaySales.filter(s => s.payment === 'transferencia').reduce((s, x) => s + x.total, 0)
  const deliveryTotal = todaySales.filter(s => s.payment === 'rappi' || s.payment === 'uber').reduce((s, x) => s + x.total, 0)
  const dayTotal = todaySales.reduce((s, x) => s + x.total, 0)

  const openTooLong = session && Date.now() - session.openTs > DIEZ_HORAS
  const lastClosed = history[0]
  const pendingDiff = lastClosed && (lastClosed.closeAmount ?? 0) !== (lastClosed.expected ?? 0) && !lastClosed.note

  return (
    <div className="mx-auto max-w-5xl pt-2 lg:pt-0">
      {/* encabezado */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Caja</h1>
          <p className="mt-0.5 text-sm text-berry-700/60">
            Caja principal · Sucursal {branch}
          </p>
        </div>
        <div className="text-right">
          <CashStatusBadge open={!!session} />
          {session && (
            <p className="mt-2 text-xs text-berry-700/55">
              Abierta desde <b>{fmtTime(session.openTs)}</b>
              {session.employeeName && <> · Atiende <b>{session.employeeName}</b></>}
            </p>
          )}
        </div>
      </div>

      {/* alertas */}
      {openTooLong && (
        <div className="mb-4 rounded-2xl border border-amber-600/25 bg-amber-50 px-5 py-3.5 text-sm font-medium text-amber-800">
          La caja lleva abierta más tiempo de lo habitual. Considera hacer el corte.
        </div>
      )}
      {pendingDiff && (
        <div className="mb-4 rounded-2xl border border-red-600/25 bg-red-50 px-5 py-3.5 text-sm font-medium text-red-700">
          El último corte tiene una diferencia pendiente de justificar.
        </div>
      )}

      {/* hero */}
      <DailyTotals expected={expected} card={cardTotal} transfer={transferTotal} delivery={deliveryTotal} total={dayTotal} open={!!session} />

      {/* acciones */}
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <QuickActionButton icon={UnlockIcon} label="Abrir caja" primary={!session} disabled={!!session} onClick={() => setSheet('abrir')} />
        <QuickActionButton icon={ReceiptIcon} label="Registrar gasto" disabled={!session} onClick={() => setSheet('gasto')} />
        <QuickActionButton icon={ArrowDownCircleIcon} label="Retiro de efectivo" disabled={!session} onClick={() => setSheet('retiro')} />
        <QuickActionButton icon={LockIcon} label="Cerrar caja" disabled={!session} onClick={() => document.getElementById('corte')?.scrollIntoView({ behavior: 'smooth' })} />
      </div>

      {session ? (
        <>
          <div className="mb-6">
            <CashMovementTimeline movements={movements} />
          </div>

          <div className="mb-6 grid gap-4 lg:grid-cols-2">
            <ExpenseCard expenses={gastos} canAdd={!!session} onAdd={() => setSheet('gasto')} />
            <WithdrawalCard withdrawals={retiros} canAdd={!!session} onAdd={() => setSheet('retiro')} />
          </div>

          <div id="corte" className="mb-8">
            <CashCountForm session={session} expected={expected} />
          </div>
        </>
      ) : (
        <div className="mb-8 rounded-3xl border border-cream-200 bg-cream-50 px-6 py-10 text-center">
          <p className="font-display text-xl text-berry-700/60">La caja está cerrada.</p>
          <p className="mt-1 text-sm text-berry-700/50">Ábrela al iniciar el día con tu fondo inicial para registrar el dinero del turno.</p>
        </div>
      )}

      {/* historial */}
      <h2 className="mb-3 text-xl font-semibold">Últimos cortes</h2>
      {history.length === 0 && <Empty text="Aquí verás el historial de tus cortes de caja." />}
      <div className="space-y-2.5 pb-4">
        {history.map(s => <HistoryRow key={s.id} s={s} />)}
      </div>

      {sheet === 'abrir' && <AbrirSheet onClose={() => setSheet(null)} />}
      {sheet === 'gasto' && session && <GastoSheet sessionId={session.id} onClose={() => setSheet(null)} />}
      {sheet === 'retiro' && session && <RetiroSheet sessionId={session.id} onClose={() => setSheet(null)} />}
    </div>
  )
}
