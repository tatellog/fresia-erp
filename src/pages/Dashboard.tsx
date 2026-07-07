import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import { money, round2, startOfDay, fmtTime, fmtDate } from '../lib/format'
import { Card, Empty } from '../components/ui'
import { StatCard } from '../features/reportes/StatCard'
import { SalesChart } from '../features/dashboard/SalesChart'
import { LineSplit } from '../features/dashboard/LineSplit'

const ranges = [
  { id: 0, label: 'Hoy' },
  { id: 6, label: '7 días' },
  { id: 29, label: '30 días' },
] as const

const CHART_DAYS = 14

/** clasifica un renglón de venta en la línea de producto que reporta */
function lineOf(name: string): 'Clásica' | 'Chocolate' | 'Balance' | 'Extras' {
  if (name.includes('Balance')) return 'Balance'
  if (name.startsWith('Chocolate ·')) return 'Chocolate'
  if (name.includes('Clásic')) return 'Clásica'
  return 'Extras'
}

export default function Dashboard() {
  const [range, setRange] = useState<number>(0)
  const from = startOfDay(range)
  const chartFrom = startOfDay(CHART_DAYS - 1)

  const sales = useLiveQuery(() => db.sales.where('ts').aboveOrEqual(Math.min(from, startOfDay(1))).toArray(), [from])
  const chartSales = useLiveQuery(() => db.sales.where('ts').aboveOrEqual(chartFrom).toArray(), [chartFrom])
  const expenses = useLiveQuery(() => db.expenses.where('ts').aboveOrEqual(from).toArray(), [from])
  const ingredients = useLiveQuery(() => db.ingredients.toArray())
  const hasPurchases = useLiveQuery(async () => (await db.purchases.count()) > 0)

  const kpis = useMemo(() => {
    if (!sales) return null
    const today = sales.filter(s => s.ts >= startOfDay(0))
    const yesterday = sales.filter(s => s.ts >= startOfDay(1) && s.ts < startOfDay(0))
    const tTotal = today.reduce((s, x) => s + x.total, 0)
    const yTotal = yesterday.reduce((s, x) => s + x.total, 0)
    const delta = yTotal > 0 ? ((tTotal - yTotal) / yTotal) * 100 : null
    return {
      total: tTotal,
      delta,
      tickets: today.length,
      avg: today.length ? tTotal / today.length : 0,
      profit: round2(today.reduce((s, x) => s + x.total - x.cost, 0)),
      /** sin compras registradas, el margen sería igual a la venta: mejor no presumirlo */
      costsKnown: today.some(x => x.cost > 0) || tTotal === 0,
    }
  }, [sales])

  const period = useMemo(() => {
    if (!sales) return null
    const inRange = sales.filter(s => s.ts >= from)
    const spent = (expenses ?? []).reduce((s, x) => s + x.amount, 0)
    const total = inRange.reduce((s, x) => s + x.total, 0)
    const cost = inRange.reduce((s, x) => s + x.cost, 0)
    const byProduct = new Map<string, { qty: number; total: number }>()
    const byPayment = new Map<string, number>()
    const byLine = new Map<string, number>([['Clásica', 0], ['Chocolate', 0], ['Balance', 0], ['Extras', 0]])
    for (const sale of inRange) {
      byPayment.set(sale.payment, (byPayment.get(sale.payment) ?? 0) + sale.total)
      for (const it of sale.items) {
        const cur = byProduct.get(it.name) ?? { qty: 0, total: 0 }
        byProduct.set(it.name, { qty: cur.qty + it.qty, total: cur.total + it.price * it.qty })
        byLine.set(lineOf(it.name), (byLine.get(lineOf(it.name)) ?? 0) + it.price * it.qty)
      }
    }
    return {
      total, cost, spent,
      profit: round2(total - cost - spent),
      tickets: inRange.length,
      top: [...byProduct.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 5),
      byPayment: [...byPayment.entries()],
      byLine: [...byLine.entries()].map(([label, t]) => ({
        label,
        total: round2(t),
        color: label === 'Balance' ? 'var(--line-olive)' : label === 'Chocolate' ? 'var(--line-choco)' : label === 'Clásica' ? 'var(--color-berry-500)' : 'var(--color-berry-200)',
      })),
      last: [...inRange].sort((a, b) => b.ts - a.ts).slice(0, 12),
    }
  }, [sales, expenses, from])

  const days = useMemo(() => {
    if (!chartSales) return null
    return Array.from({ length: CHART_DAYS }, (_, i) => {
      const ts = startOfDay(CHART_DAYS - 1 - i)
      const end = ts + 24 * 3600_000
      return { ts, total: round2(chartSales.filter(s => s.ts >= ts && s.ts < end).reduce((x, s) => x + s.total, 0)) }
    })
  }, [chartSales])

  if (!sales || !kpis || !period || !days || !ingredients) return null
  const low = ingredients.filter(i => i.stock <= i.minStock)

  return (
    <div className="mx-auto max-w-4xl pt-2 lg:pt-0">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex gap-1 rounded-full bg-cream-200 p-1">
          {ranges.map(r => (
            <button
              key={r.id}
              onClick={() => setRange(r.id)}
              className={`rounded-full px-3.5 py-1 text-xs font-semibold ${range === r.id ? 'bg-berry-500 text-white' : 'text-berry-700'}`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* hoy, siempre visible */}
      <div className="mb-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <StatCard
          label="Ventas de hoy"
          value={money(kpis.total)}
          accent={kpis.delta === null ? '' : kpis.delta >= 0 ? 'text-green-700' : 'text-red-600'}
        />
        <StatCard label="Tickets hoy" value={String(kpis.tickets)} />
        <StatCard label="Ticket promedio" value={money(kpis.avg)} />
        <StatCard
          label={kpis.costsKnown ? 'Margen bruto hoy' : 'Margen (faltan costos)'}
          value={kpis.costsKnown ? money(kpis.profit) : '·'}
          accent={kpis.costsKnown ? 'text-green-700' : ''}
        />
      </div>
      {kpis.delta !== null && (
        <p className="mb-4 -mt-1 px-1 text-xs text-berry-700/60">
          {kpis.delta >= 0 ? '▲' : '▼'} {Math.abs(kpis.delta).toFixed(0)}% vs. ayer a cierre de día
        </p>
      )}

      <Card className="mb-3">
        <h2 className="mb-2 text-lg font-semibold">Ventas · últimos 14 días</h2>
        <SalesChart days={days} />
      </Card>

      <div className="mb-3 grid gap-3 md:grid-cols-2">
        <Card>
          <h2 className="mb-3 text-lg font-semibold">Por línea · {ranges.find(r => r.id === range)!.label.toLowerCase()}</h2>
          <LineSplit lines={period.byLine} />
        </Card>
        <Card>
          <h2 className="mb-2 text-lg font-semibold">Resumen del periodo</h2>
          <div className="space-y-1 text-sm">
            <Row k="Ventas" v={money(period.total)} />
            <Row k={`Tickets (${period.tickets})`} v={period.tickets ? money(period.total / period.tickets) + ' prom.' : '·'} />
            <Row k="Costo de insumos" v={'−' + money(period.cost)} />
            <Row k="Gastos" v={'−' + money(period.spent)} />
            <div className="border-t border-cream-200 pt-1">
              <Row k="Utilidad estimada" v={money(period.profit)} strong />
            </div>
          </div>
        </Card>
      </div>

      <div className="mb-3 grid gap-3 md:grid-cols-2">
        <Card>
          <h2 className="mb-2 text-lg font-semibold">Más vendidos</h2>
          {period.top.length === 0 && <p className="py-4 text-sm text-berry-700/50">Sin ventas en el periodo.</p>}
          {period.top.map(([name, v], i) => (
            <div key={name} className="flex items-center justify-between py-1 text-sm">
              <span className="min-w-0 flex-1 truncate">
                <span className="mr-1.5 font-semibold text-berry-300">{i + 1}.</span>
                {name}
              </span>
              <span className="ml-2 text-berry-700/60">×{v.qty}</span>
              <b className="ml-3 w-20 text-right tabular-nums">{money(v.total)}</b>
            </div>
          ))}
        </Card>
        <Card>
          <h2 className="mb-2 text-lg font-semibold">Métodos de pago</h2>
          {period.byPayment.length === 0 && <p className="py-4 text-sm text-berry-700/50">Sin ventas en el periodo.</p>}
          {period.byPayment.map(([p, t]) => (
            <div key={p} className="flex justify-between py-1 text-sm capitalize">
              <span>{p}</span><b className="tabular-nums">{money(t)}</b>
            </div>
          ))}
          {hasPurchases && low.length > 0 && (
            <div className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
              Stock bajo: {low.slice(0, 3).map(i => i.name).join(', ')}{low.length > 3 && ` y ${low.length - 3} más`}
            </div>
          )}
        </Card>
      </div>

      <h2 className="mb-2 px-1 text-lg font-semibold">Últimas ventas</h2>
      {period.last.length === 0 && <Empty text="Aún no hay ventas en este periodo." />}
      <div className="space-y-1.5">
        {period.last.map(s => (
          <div key={s.id} className="flex items-center justify-between rounded-xl border border-cream-200 bg-cream-50 px-3 py-2 text-sm">
            <div className="min-w-0 flex-1">
              <div className="truncate">{s.items.map(i => `${i.qty}× ${i.name}`).join(', ')}</div>
              <div className="text-xs text-berry-700/50">
                {range === 0 ? fmtTime(s.ts) : `${fmtDate(s.ts)} ${fmtTime(s.ts)}`} · {s.payment}
                {s.employeeName && ` · ${s.employeeName}`}
              </div>
            </div>
            <b className="ml-2 tabular-nums">{money(s.total)}</b>
          </div>
        ))}
      </div>
    </div>
  )
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between py-0.5 ${strong ? 'text-base font-bold' : ''}`}>
      <span>{k}</span>
      <span className="tabular-nums">{v}</span>
    </div>
  )
}
