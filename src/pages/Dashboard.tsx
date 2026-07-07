import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import {
  cupsBySize, delta, hourlySales, profit, salesByLine, salesSummary, stockStatus, topProduct, topToppings,
} from '../services/analytics'
import { money, round2, startOfDay } from '../lib/format'
import { BagIcon, BanknoteIcon, BoxIcon, CupIcon, PlusIcon, ReceiptIcon, StarIcon, WalletIcon } from '../components/ui/icons'
import { CashStatusBadge } from '../features/caja/CashStatusBadge'
import { QuickActionButton } from '../features/caja/QuickActionButton'
import { DashboardHero } from '../features/dashboard/DashboardHero'
import { KpiCard } from '../features/dashboard/KpiCard'
import { GoalProgress } from '../features/dashboard/GoalProgress'
import { SalesCard } from '../features/dashboard/SalesCard'
import { TopSellingCard } from '../features/dashboard/TopSellingCard'
import { TopToppingsCard } from '../features/dashboard/TopToppingsCard'
import { InventoryAlert } from '../features/dashboard/InventoryAlert'
import { ProfitCard } from '../features/dashboard/ProfitCard'
import { HourlySalesChart } from '../features/dashboard/HourlySalesChart'
import { AlertBanner } from '../features/dashboard/AlertBanner'
import { ComparisonCard } from '../features/dashboard/ComparisonCard'
import { SalesChart } from '../features/dashboard/SalesChart'

const CHART_DAYS = 14

function saludo() {
  const h = new Date().getHours()
  return h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches'
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])

  const sales14 = useLiveQuery(() => db.sales.where('ts').aboveOrEqual(startOfDay(CHART_DAYS - 1)).toArray())
  const ingredients = useLiveQuery(() => db.ingredients.toArray())
  const hasPurchases = useLiveQuery(async () => (await db.purchases.count()) > 0)
  const openSession = useLiveQuery(async () => (await db.cashSessions.filter(s => s.closeTs === undefined).last()) ?? null)
  const lastClosed = useLiveQuery(() => db.cashSessions.orderBy('openTs').reverse().filter(s => s.closeTs !== undefined).first())
  const branch = useLiveQuery(async () => (await db.meta.get('branch'))?.value || 'Principal')
  const activeEmployee = useLiveQuery(async () => {
    const id = (await db.meta.get('activeEmployeeId'))?.value
    return id ? (await db.employees.get(id))?.name : undefined
  })
  const goalMoney = useLiveQuery(async () => Number((await db.meta.get('goalMoney'))?.value) || 2500)
  const goalCups = useLiveQuery(async () => Number((await db.meta.get('goalCups'))?.value) || 30)

  const data = useMemo(() => {
    if (!sales14) return null
    const today = sales14.filter(s => s.ts >= startOfDay(0))
    const yesterday = sales14.filter(s => s.ts >= startOfDay(1) && s.ts < startOfDay(0))
    const weekAgo = sales14.filter(s => s.ts >= startOfDay(7) && s.ts < startOfDay(6))
    const week = sales14.filter(s => s.ts >= startOfDay(6))
    const resumen = salesSummary(today)
    return {
      resumen,
      ayer: salesSummary(yesterday).total,
      semanaPasada: salesSummary(weekAgo).total,
      deltaAyer: delta(resumen.total, salesSummary(yesterday).total),
      lineas: salesByLine(today),
      tamanos: cupsBySize(today),
      toppings: topToppings(week, 5),
      top: topProduct(today),
      utilidad: profit(today),
      costsKnown: today.some(s => s.cost > 0) || today.length === 0,
      horas: hourlySales(week),
      dias: Array.from({ length: CHART_DAYS }, (_, i) => {
        const ts = startOfDay(CHART_DAYS - 1 - i)
        const end = ts + 24 * 3600_000
        return { ts, total: round2(sales14.filter(s => s.ts >= ts && s.ts < end).reduce((x, s) => x + s.total, 0)) }
      }),
    }
  }, [sales14])

  const stocks = useMemo(
    () => (ingredients && hasPurchases ? stockStatus(ingredients).slice(0, 6) : []),
    [ingredients, hasPurchases],
  )

  if (!data || !ingredients || hasPurchases === undefined || openSession === undefined) return null

  const alerts: string[] = []
  for (const st of stocks.filter(s => s.level === 'critico').slice(0, 3))
    alerts.push(`Quedan ${round2(st.ingredient.stock)} ${st.ingredient.unit} de ${st.ingredient.name}: comprar hoy.`)
  if (openSession && Date.now() - openSession.openTs > 10 * 3600_000)
    alerts.push('La caja lleva abierta más tiempo de lo habitual: haz el corte.')
  if (!openSession && data.resumen.tickets === 0 && now.getHours() >= 10 && now.getHours() < 20)
    alerts.push('La caja sigue cerrada: ábrela para empezar el día.')
  if (lastClosed && (lastClosed.closeAmount ?? 0) !== (lastClosed.expected ?? 0) && !lastClosed.note)
    alerts.push('El último corte tiene una diferencia pendiente de justificar.')

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-6 pt-2 lg:pt-0">
      {/* encabezado */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{saludo()}{activeEmployee ? `, ${activeEmployee}` : ''}</h1>
          <p className="mt-0.5 text-sm text-berry-700/60">Sucursal {branch}</p>
        </div>
        <div className="text-right">
          <CashStatusBadge open={!!openSession} />
          <p className="mt-2 text-xs capitalize text-berry-700/55">
            {now.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })} · {now.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>

      {/* accesos rápidos */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <QuickActionButton icon={PlusIcon} label="Nueva venta" primary onClick={() => navigate('/')} />
        <QuickActionButton icon={BoxIcon} label="Comprar insumos" onClick={() => navigate('/inventario')} />
        <QuickActionButton icon={WalletIcon} label="Ir a Caja" onClick={() => navigate('/caja')} />
        <QuickActionButton icon={BagIcon} label="Ver menú" onClick={() => navigate('/productos')} />
      </div>

      <DashboardHero total={data.resumen.total} cups={data.resumen.cups} deltaPct={data.deltaAyer} goalMoney={goalMoney ?? 2500} />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <KpiCard icon={BanknoteIcon} value={money(data.resumen.total)} label="Ventas del día" />
        <KpiCard icon={CupIcon} value={String(data.resumen.cups)} label="Vasos vendidos" />
        <KpiCard icon={ReceiptIcon} value={money(data.resumen.avgTicket)} label="Ticket promedio" />
        <KpiCard
          icon={StarIcon}
          value={data.top ? data.top.name.split('·')[1]?.trim().split(' ')[0] ?? data.top.name : '·'}
          label="Más vendido hoy"
          sub={data.top ? `${data.top.name.split('·')[0].trim()} · ${data.top.count} vasos` : 'aún sin ventas'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SalesCard lines={data.lineas} />
        <TopSellingCard sizes={data.tamanos} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <TopToppingsCard toppings={data.toppings} />
        <ProfitCard {...data.utilidad} costsKnown={data.costsKnown} />
      </div>

      <InventoryAlert statuses={stocks} />

      <div className="grid gap-4 lg:grid-cols-2">
        <HourlySalesChart hours={data.horas} subtitle="Suma de los últimos 7 días · para saber cuándo necesitas más manos" />
        <div className="space-y-4">
          <div className="rounded-3xl border border-cream-200 bg-cream-50 p-6">
            <h2 className="mb-4 text-xl font-semibold">Objetivo del día</h2>
            <GoalProgress
              label={`Meta · ${goalCups} vasos`}
              valueLabel={`${data.resumen.cups} vendidos · faltan ${Math.max(0, (goalCups ?? 30) - data.resumen.cups)}`}
              pct={goalCups ? Math.round((data.resumen.cups / goalCups) * 100) : 0}
            />
          </div>
          <ComparisonCard today={data.resumen.total} yesterday={data.ayer} weekAgo={data.semanaPasada} />
        </div>
      </div>

      <AlertBanner alerts={alerts} />

      <div className="rounded-3xl border border-cream-200 bg-cream-50 p-6">
        <h2 className="mb-2 text-xl font-semibold">Tendencia · últimos 14 días</h2>
        <SalesChart days={data.dias} />
      </div>
    </div>
  )
}
