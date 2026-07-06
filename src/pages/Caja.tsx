import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type CashSession } from '../db'
import { money, fmtDateTime, fmtTime, round2 } from '../lib/format'
import { Button, Card, Empty, Field, Input, Sheet } from '../components/ui'

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
        <Card className="mb-4 text-center">
          <div className="mb-1 text-3xl">🔒</div>
          <p className="mb-3 text-sm text-berry-700/70">La caja está cerrada. Ábrela al iniciar el día con tu fondo inicial.</p>
          <Button onClick={() => setSheet('abrir')}>Abrir caja</Button>
        </Card>
      ) : (
        <>
          <Card className="mb-3">
            <div className="mb-2 flex items-center justify-between text-sm text-berry-700/60">
              <span>Abierta {fmtDateTime(session.openTs)}</span>
              <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-bold text-green-700">ACTIVA</span>
            </div>
            <Row label="Fondo inicial" value={session.openAmount} />
            <Row label={`Ventas en efectivo (${(sales ?? []).filter(s => s.payment === 'efectivo').length})`} value={cashSales} />
            <Row label="Gastos" value={-spent} />
            <div className="my-2 border-t border-cream-300" />
            <Row label="Efectivo esperado en caja" value={expected} bold />
            <Row label="Tarjeta / transferencia" value={otherSales} muted />
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
      {history.length === 0 && <Empty emoji="🧾" text="Aquí verás el historial de tus cortes de caja." />}
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

function Row({ label, value, bold, muted }: { label: string; value: number; bold?: boolean; muted?: boolean }) {
  return (
    <div className={`flex justify-between py-0.5 ${bold ? 'text-base font-bold' : 'text-sm'} ${muted ? 'text-berry-700/50' : ''}`}>
      <span>{label}</span>
      <span className="tabular-nums">{money(value)}</span>
    </div>
  )
}

function HistoryRow({ s }: { s: CashSession }) {
  const diff = round2((s.closeAmount ?? 0) - (s.expected ?? 0))
  return (
    <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm">
      <span className="text-berry-700/70">{fmtDateTime(s.openTs)}</span>
      <span className="tabular-nums">
        contado <b>{money(s.closeAmount ?? 0)}</b>{' '}
        {diff === 0 ? (
          <span className="text-green-700">✓ exacto</span>
        ) : (
          <span className={diff > 0 ? 'text-green-700' : 'text-red-600'}>
            {diff > 0 ? 'sobró' : 'faltó'} {money(Math.abs(diff))}
          </span>
        )}
      </span>
    </div>
  )
}

function AbrirSheet({ onClose }: { onClose: () => void }) {
  const [amount, setAmount] = useState('')
  const a = parseFloat(amount)
  return (
    <Sheet open onClose={onClose} title="Abrir caja">
      <Field label="Fondo inicial en efectivo ($)">
        <Input type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} autoFocus />
      </Field>
      <Button
        className="w-full"
        disabled={!(a >= 0)}
        onClick={async () => {
          await db.cashSessions.add({ openTs: Date.now(), openAmount: a || 0 } as CashSession)
          onClose()
        }}
      >
        Abrir caja
      </Button>
    </Sheet>
  )
}

function GastoSheet({ sessionId, onClose }: { sessionId: number; onClose: () => void }) {
  const [concept, setConcept] = useState('')
  const [amount, setAmount] = useState('')
  const a = parseFloat(amount)
  return (
    <Sheet open onClose={onClose} title="Registrar gasto">
      <Field label="Concepto">
        <Input value={concept} onChange={e => setConcept(e.target.value)} placeholder="Hielo, bolsas, gasolina…" autoFocus />
      </Field>
      <Field label="Monto ($)">
        <Input type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} />
      </Field>
      <Button
        className="w-full"
        disabled={!(concept.trim() && a > 0)}
        onClick={async () => {
          await db.expenses.add({ ts: Date.now(), concept: concept.trim(), amount: a, sessionId } as never)
          onClose()
        }}
      >
        Guardar gasto
      </Button>
    </Sheet>
  )
}

function CerrarSheet({ session, expected, onClose }: { session: CashSession; expected: number; onClose: () => void }) {
  const [counted, setCounted] = useState('')
  const c = parseFloat(counted)
  const diff = round2((c || 0) - expected)
  return (
    <Sheet open onClose={onClose} title="Corte de caja">
      <p className="mb-3 text-sm text-berry-700/70">
        Efectivo esperado: <b>{money(expected)}</b>. Cuenta el dinero de la caja y captura el total.
      </p>
      <Field label="Efectivo contado ($)">
        <Input type="number" inputMode="decimal" value={counted} onChange={e => setCounted(e.target.value)} autoFocus />
      </Field>
      {counted !== '' && (
        <p className={`mb-3 text-sm font-semibold ${diff === 0 ? 'text-green-700' : diff > 0 ? 'text-green-700' : 'text-red-600'}`}>
          {diff === 0 ? '✓ Cuadra exacto' : diff > 0 ? `Sobran ${money(diff)}` : `Faltan ${money(Math.abs(diff))}`}
        </p>
      )}
      <Button
        className="w-full"
        disabled={!(c >= 0)}
        onClick={async () => {
          await db.cashSessions.update(session.id, { closeTs: Date.now(), closeAmount: c, expected })
          onClose()
        }}
      >
        Cerrar caja
      </Button>
    </Sheet>
  )
}
