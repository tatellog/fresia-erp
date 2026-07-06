import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import { money, fmtDateTime, fmtTime, round2 } from '../lib/format'
import { Button, Card, Empty } from '../components/ui'
import { SummaryRow } from '../features/caja/SummaryRow'
import { HistoryRow } from '../features/caja/HistoryRow'
import { AbrirSheet } from '../features/caja/AbrirSheet'
import { GastoSheet } from '../features/caja/GastoSheet'
import { CerrarSheet } from '../features/caja/CerrarSheet'

export default function Caja() {
  const session = useLiveQuery(() => db.cashSessions.filter(s => s.closeTs === undefined).last())
  const sales = useLiveQuery(
    async () => (session ? db.sales.where('sessionId').equals(session.id).toArray() : []),
    [session?.id],
  )
  const expenses = useLiveQuery(
    async () => (session ? db.expenses.where('sessionId').equals(session.id).toArray() : []),
    [session?.id],
  )
  const history = useLiveQuery(() =>
    db.cashSessions.orderBy('openTs').reverse().filter(s => s.closeTs !== undefined).limit(10).toArray(),
  )
  const [sheet, setSheet] = useState<'abrir' | 'cerrar' | 'gasto' | null>(null)

  if (session === undefined || !history) return null

  const cashSales = (sales ?? []).filter(s => s.payment === 'efectivo').reduce((s, x) => s + x.total, 0)
  const otherSales = (sales ?? []).filter(s => s.payment !== 'efectivo').reduce((s, x) => s + x.total, 0)
  const spent = (expenses ?? []).reduce((s, x) => s + x.amount, 0)
  const expected = session ? round2(session.openAmount + cashSales - spent) : 0

  return (
    <div className="mx-auto max-w-2xl pt-2 lg:pt-0">
      <h1 className="mb-3 text-lg font-bold">Caja</h1>

      {!session ? (
        <Card className="mb-4 py-6 text-center">
          <h2 className="mb-1 text-xl font-semibold">Caja cerrada</h2>
          <p className="mb-4 text-sm text-berry-700/70">Ábrela al iniciar el día con tu fondo inicial.</p>
          <Button onClick={() => setSheet('abrir')}>Abrir caja</Button>
        </Card>
      ) : (
        <>
          <Card className="mb-3">
            <div className="mb-2 flex items-center justify-between text-sm text-berry-700/60">
              <span>Abierta {fmtDateTime(session.openTs)}</span>
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">ACTIVA</span>
            </div>
            <SummaryRow label="Fondo inicial" value={session.openAmount} />
            <SummaryRow label={`Ventas en efectivo (${(sales ?? []).filter(s => s.payment === 'efectivo').length})`} value={cashSales} />
            <SummaryRow label="Gastos" value={-spent} />
            <div className="my-2 border-t border-cream-300" />
            <SummaryRow label="Efectivo esperado en caja" value={expected} bold />
            <SummaryRow label="Tarjeta / transferencia" value={otherSales} muted />
          </Card>

          <div className="mb-4 flex gap-2">
            <Button variant="soft" className="flex-1" onClick={() => setSheet('gasto')}>+ Gasto</Button>
            <Button className="flex-1" onClick={() => setSheet('cerrar')}>Hacer corte</Button>
          </div>

          {(expenses ?? []).length > 0 && (
            <div className="mb-4">
              <h2 className="mb-2 text-sm font-bold text-berry-700/70">Gastos del turno</h2>
              <div className="space-y-1.5">
                {(expenses ?? []).map(e => (
                  <div key={e.id} className="flex justify-between rounded-xl bg-white px-3 py-2 text-sm">
                    <span>{e.concept} <span className="text-berry-700/50">· {fmtTime(e.ts)}</span></span>
                    <b className="tabular-nums">−{money(e.amount)}</b>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <h2 className="mb-2 text-sm font-bold text-berry-700/70">Cortes anteriores</h2>
      {history.length === 0 && <Empty text="Aquí verás el historial de tus cortes de caja." />}
      <div className="space-y-1.5">
        {history.map(s => (
          <HistoryRow key={s.id} s={s} />
        ))}
      </div>

      {sheet === 'abrir' && <AbrirSheet onClose={() => setSheet(null)} />}
      {sheet === 'gasto' && session && <GastoSheet sessionId={session.id} onClose={() => setSheet(null)} />}
      {sheet === 'cerrar' && session && <CerrarSheet session={session} expected={expected} onClose={() => setSheet(null)} />}
    </div>
  )
}
