import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'
import { money, round2, startOfDay, fmtTime, fmtDate } from '../lib/format'
import { Card, Empty } from '../components/ui'

const ranges = [
  { id: 0, label: 'Hoy' },
  { id: 6, label: '7 días' },
  { id: 29, label: '30 días' },
] as const

export default function Reportes() {
  const [range, setRange] = useState<number>(0)
  const from = startOfDay(range)

  const sales = useLiveQuery(() => db.sales.where('ts').aboveOrEqual(from).toArray(), [from])
  const expenses = useLiveQuery(() => db.expenses.where('ts').aboveOrEqual(from).toArray(), [from])
  const wastes = useLiveQuery(() => db.wastes.where('ts').aboveOrEqual(from).toArray(), [from])

  const stats = useMemo(() => {
    if (!sales) return null
    const total = sales.reduce((s, x) => s + x.total, 0)
    const cost = sales.reduce((s, x) => s + x.cost, 0)
    const spent = (expenses ?? []).reduce((s, x) => s + x.amount, 0)
    const byProduct = new Map<string, { qty: number; total: number }>()
    const byPayment = new Map<string, number>()
    for (const sale of sales) {
      byPayment.set(sale.payment, (byPayment.get(sale.payment) ?? 0) + sale.total)
      for (const it of sale.items) {
        const cur = byProduct.get(it.name) ?? { qty: 0, total: 0 }
        byProduct.set(it.name, { qty: cur.qty + it.qty, total: cur.total + it.price * it.qty })
      }
    }
    return {
      total, cost, spent,
      profit: round2(total - cost - spent),
      tickets: sales.length,
      avg: sales.length ? total / sales.length : 0,
      top: [...byProduct.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 6),
      byPayment: [...byPayment.entries()],
    }
  }, [sales, expenses])

  if (!sales || !stats) return null

  return (
    <div className="mx-auto max-w-3xl pt-2 lg:pt-0">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">Reportes</h1>
        <div className="flex gap-1 rounded-full bg-cream-200 p-1">
          {ranges.map(r => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={`rounded-full px-3 py-1 text-xs font-bold ${range === r.id ? 'bg-berry-500 text-white' : 'text-berry-700'}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <Stat label="Ventas" value={money(stats.total)} />
        <Stat label="Utilidad estimada" value={money(stats.profit)} accent={stats.profit >= 0 ? 'text-green-700' : 'text-red-600'} />
        <Stat label="Tickets" value={String(stats.tickets)} />
        <Stat label="Ticket promedio" value={money(stats.avg)} />
      </div>

      <Card className="mb-3 text-sm">
        <div className="flex justify-between py-0.5"><span>Costo de insumos vendidos</span><b className="tabular-nums">−{money(stats.cost)}</b></div>
        <div className="flex justify-between py-0.5"><span>Gastos</span><b className="tabular-nums">−{money(stats.spent)}</b></div>
        {(wastes ?? []).length > 0 && (
          <div className="flex justify-between py-0.5 text-berry-700/60">
            <span>Mermas registradas</span><span>{(wastes ?? []).length}</span>
          </div>
        )}
      </Card>

      {stats.top.length > 0 && (
        <>
          <h2 className="mb-2 text-sm font-bold text-berry-700/70">Más vendidos</h2>
          <Card className="mb-3">
            {stats.top.map(([name, v], i) => (
              <div key={name} className="flex items-center justify-between py-1 text-sm">
                <span className="min-w-0 flex-1 truncate">
                  <span className="mr-1.5 font-bold text-berry-300">{i + 1}.</span>
                  {name}
                </span>
                <span className="ml-2 text-berry-700/60">×{v.qty}</span>
                <b className="ml-3 w-20 text-right tabular-nums">{money(v.total)}</b>
              </div>
            ))}
          </Card>
        </>
      )}

      {stats.byPayment.length > 0 && (
        <>
          <h2 className="mb-2 text-sm font-bold text-berry-700/70">Por método de pago</h2>
          <Card className="mb-3 text-sm">
            {stats.byPayment.map(([p, t]) => (
              <div key={p} className="flex justify-between py-0.5 capitalize">
                <span>{p}</span><b className="tabular-nums">{money(t)}</b>
              </div>
            ))}
          </Card>
        </>
      )}

      <h2 className="mb-2 text-sm font-bold text-berry-700/70">Últimas ventas</h2>
      {sales.length === 0 && <Empty emoji="🧾" text="Aún no hay ventas en este periodo." />}
      <div className="space-y-1.5">
        {[...sales].sort((a, b) => b.ts - a.ts).slice(0, 25).map(s => (
          <div key={s.id} className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-sm">
            <div className="min-w-0 flex-1">
              <div className="truncate">{s.items.map(i => `${i.qty}× ${i.name}`).join(', ')}</div>
              <div className="text-xs text-berry-700/50">
                {range === 0 ? fmtTime(s.ts) : `${fmtDate(s.ts)} ${fmtTime(s.ts)}`} · {s.payment}
              </div>
            </div>
            <b className="ml-2 tabular-nums">{money(s.total)}</b>
          </div>
        ))}
      </div>
    </div>
  )
}

function Stat({ label, value, accent = '' }: { label: string; value: string; accent?: string }) {
  return (
    <Card className="py-3">
      <div className="text-xs font-medium text-berry-700/60">{label}</div>
      <div className={`text-xl font-extrabold tabular-nums ${accent}`}>{value}</div>
    </Card>
  )
}
