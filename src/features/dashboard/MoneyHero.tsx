import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import type { Payment } from '../../data/types'
import { profit, salesSummary } from '../../services/analytics'
import { channelProfit, dayExtremes, explainChange, pctChange, periodMetrics, previousWindow, topProducts } from '../../services/insights'
import { MetricTile } from './MetricTile'
import { money, moneyInt, round2, startOfDay } from '../../lib/format'
import { GoalProgress } from './GoalProgress'

const PERIODOS = [
  { id: 'hoy', label: 'Hoy', days: 1 },
  { id: '7d', label: '7 días', days: 7 },
  { id: 'quincena', label: 'Quincena', days: 15 },
  { id: 'mes', label: 'Mes', days: 30 },
] as const
type PeriodId = (typeof PERIODOS)[number]['id']

const CANALES: { id: Payment; label: string; color: string }[] = [
  { id: 'efectivo', label: 'Efectivo', color: 'var(--color-green-600)' },
  { id: 'tarjeta', label: 'Tarjeta', color: 'var(--color-berry-500)' },
  { id: 'transferencia', label: 'Transferencia', color: '#6b9fe8' },
  { id: 'rappi', label: 'Rappi', color: '#FF441F' },
  { id: 'didi', label: 'DiDi', color: '#FF7C33' },
  { id: 'office', label: 'Frésia Office', color: 'var(--color-berry-500)' },
]

/**
 * Protagonista del Dashboard: cómo va el dinero. Ventas y ganancia en
 * grande con periodo de un toque, y el desglose visual por canal de cobro.
 */
export function MoneyHero({ goalMoney }: { goalMoney: number }) {
  const [periodo, setPeriodo] = useState<PeriodId>('hoy')
  // dos meses: el periodo más largo y el anterior del mismo largo para comparar
  const sales30 = useLiveQuery(() => db.sales.where('ts').aboveOrEqual(startOfDay(59)).toArray())

  const data = useMemo(() => {
    if (!sales30) return null
    const def = PERIODOS.find(p => p.id === periodo)!
    const desde = startOfDay(def.days - 1)
    const enPeriodo = sales30.filter(s => s.ts >= desde)
    const resumen = salesSummary(enPeriodo)
    const utilidad = profit(enPeriodo)
    const costsKnown = enPeriodo.some(s => s.cost > 0) || enPeriodo.length === 0
    const [pDesde, pHasta] = previousWindow(desde, Date.now(), def.days)
    const actual = periodMetrics(enPeriodo)
    const anterior = periodMetrics(sales30.filter(s => s.ts >= pDesde && s.ts < pHasta))
    const top = topProducts(enPeriodo)
    const extremos = periodo === 'hoy' ? {} : dayExtremes(enPeriodo)
    const mejorCanal = channelProfit(enPeriodo).find(c => c.profit > 0)
    const canales = CANALES.map(c => {
      const del = enPeriodo.filter(s => s.payment === c.id)
      const monto = round2(del.reduce((s, x) => s + x.total, 0))
      const fees = round2(del.reduce((s, x) => s + (x.fee ?? 0), 0))
      const neto = round2(monto - fees)
      return { ...c, monto, fees, neto, cobros: del.length, pct: resumen.net > 0 ? Math.round((neto / resumen.net) * 100) : 0 }
    })
    return {
      def, resumen, utilidad, costsKnown, canales,
      actual, anterior, top, extremos, mejorCanal,
      cambio: pctChange(actual.net, anterior.net),
      explicacion: explainChange(actual, anterior),
      margen: resumen.total > 0 ? Math.round((utilidad.profit / resumen.total) * 100) : 0,
      promedioDiario: round2(resumen.net / def.days),
    }
  }, [sales30, periodo])

  if (!data) return null
  const { resumen, utilidad, costsKnown, canales, margen, actual, anterior, top, extremos, mejorCanal, cambio } = data
  const vsAnterior = periodo === 'hoy' ? 'vs. ayer a esta hora' : `vs. ${data.def.days} días anteriores`
  const corto = (n: string) => n.replace(' · ', ' ')
  const dia = (ts: number) => {
    const t = new Date(ts).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' })
    return t.charAt(0).toUpperCase() + t.slice(1)
  }

  return (
    <div className="rounded-3xl border border-cream-200 bg-cream-50 p-7 lg:p-9">
      {/* periodo de un toque */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-berry-700/60">
          {periodo === 'hoy' ? 'Ventas de hoy' : `Ventas · últimos ${data.def.days} días`}
        </span>
        <div className="flex gap-1.5">
          {PERIODOS.map(p => (
            <button
              key={p.id}
              onClick={() => setPeriodo(p.id)}
              className={`rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-colors ${
                periodo === p.id ? 'border-berry-500 bg-berry-500 text-white shadow-sm' : 'border-cream-300 text-berry-700/70'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-wrap items-end gap-x-10 gap-y-6">
          <div>
            <div className="font-display text-[56px] font-bold leading-none tabular-nums lg:text-[68px]">{moneyInt(resumen.net)}</div>
            <div className="mt-3 flex items-center gap-3 text-sm text-berry-700/70">
              <span><b className="text-berry-900">{resumen.units}</b> productos · {resumen.tickets} cobros</span>
              {cambio !== null && (
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  cambio >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600'
                }`}>
                  {cambio >= 0 ? '↑' : '↓'} {Math.abs(cambio).toLocaleString('es-MX')}% {vsAnterior}
                </span>
              )}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-berry-700/60">Ganancia</div>
            <div className="mt-2 font-display text-[40px] font-bold leading-none tabular-nums text-green-700 lg:text-[48px]">
              {costsKnown ? money(utilidad.profit) : '·'}
            </div>
            <div className="mt-3 text-sm text-berry-700/70">
              {costsKnown
                ? <>después de insumos{utilidad.fees > 0 && <> y {money(utilidad.fees)} de comisión de tarjeta</>} · <b className="text-berry-900">{margen}%</b> de margen</>
                : 'registra compras de insumos para calcularla'}
            </div>
          </div>
        </div>
        <div className="w-full max-w-sm flex-1">
          {periodo === 'hoy' ? (
            <GoalProgress
              label="Meta diaria"
              valueLabel={`${moneyInt(resumen.net)} de ${money(goalMoney)}`}
              pct={goalMoney > 0 ? Math.round((resumen.net / goalMoney) * 100) : 0}
            />
          ) : (
            <div className="text-right">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-berry-700/60">Promedio diario</div>
              <div className="mt-1.5 font-display text-[28px] font-bold tabular-nums">{moneyInt(data.promedioDiario)}</div>
            </div>
          )}
        </div>
      </div>

      {/* de dónde viene: clientes, ticket y productos por ticket, y lo que costó */}
      <div className="mt-7 border-t border-cream-200 pt-6">
        {data.explicacion && <p className="mb-5 text-sm text-berry-700/80">{data.explicacion}</p>}
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-3 xl:grid-cols-6">
          <MetricTile label="Tickets" value={String(actual.tickets)} change={pctChange(actual.tickets, anterior.tickets)} />
          <MetricTile label="Ticket promedio" value={moneyInt(actual.avgTicket)} change={pctChange(actual.avgTicket, anterior.avgTicket)} />
          <MetricTile label="Productos por ticket" value={actual.unitsPerTicket.toLocaleString('es-MX')} change={pctChange(actual.unitsPerTicket, anterior.unitsPerTicket)} />
          <MetricTile
            label="Costo de lo vendido"
            value={actual.costsKnown ? moneyInt(actual.cogs) : '·'}
            change={actual.costsKnown && anterior.costsKnown ? pctChange(actual.cogs, anterior.cogs) : null}
            invert
            hint={actual.costsKnown ? undefined : 'faltan compras de insumos'}
          />
          <MetricTile
            label="Utilidad estimada"
            value={actual.costsKnown ? moneyInt(actual.profit) : '·'}
            change={actual.costsKnown && anterior.costsKnown ? pctChange(actual.profit, anterior.profit) : null}
            hint={actual.costsKnown ? undefined : 'faltan compras de insumos'}
          />
          <MetricTile
            label="Margen bruto"
            value={actual.costsKnown ? `${actual.margin.toLocaleString('es-MX')}%` : '·'}
            change={actual.costsKnown && anterior.costsKnown && anterior.margin > 0 ? Math.round((actual.margin - anterior.margin) * 10) / 10 : null}
            hint={actual.costsKnown ? undefined : 'faltan compras de insumos'}
            unit="pts"
          />
        </div>
      </div>

      {/* lo que sirve para decidir */}
      {actual.tickets > 0 && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          {top.bestSeller && (
            <Dato label="Más vendido" value={corto(top.bestSeller.name)} sub={`${top.bestSeller.units} ${top.bestSeller.units === 1 ? 'vendido' : 'vendidos'} · ${moneyInt(top.bestSeller.revenue)}`} />
          )}
          {top.mostProfitable && (
            <Dato label="Más rentable" value={corto(top.mostProfitable.name)} sub={`dejó ${moneyInt(top.mostProfitable.profit)} · ${top.mostProfitable.units} ${top.mostProfitable.units === 1 ? 'vendido' : 'vendidos'}`} />
          )}
          {extremos.best && <Dato label="Mejor día" value={dia(extremos.best.ts)} sub={moneyInt(extremos.best.net)} />}
          {extremos.worst && <Dato label="Peor día" value={dia(extremos.worst.ts)} sub={moneyInt(extremos.worst.net)} />}
          {mejorCanal && actual.costsKnown && (
            <Dato
              label="Canal más rentable"
              value={CANALES.find(c => c.id === mejorCanal.payment)?.label ?? mejorCanal.payment}
              sub={`dejó ${moneyInt(mejorCanal.profit)} ya sin insumos ni comisión`}
            />
          )}
        </div>
      )}

      {/* cómo te pagaron */}
      <div className="mt-7 grid gap-x-10 gap-y-3.5 border-t border-cream-200 pt-6 md:grid-cols-2">
        {canales.map(c => (
          <div key={c.id} className={c.monto === 0 ? 'opacity-40' : ''}>
            <div className="mb-1 flex items-baseline justify-between text-sm">
              <span className="flex items-center gap-2 font-medium">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />
                {c.label}
                {c.cobros > 0 && <span className="text-xs text-berry-700/50">· {c.cobros}</span>}
              </span>
              <span className="tabular-nums">
                <b>{money(c.neto)}</b> <span className="text-berry-700/60">· {c.pct}%</span>
                {c.id === 'tarjeta' && c.fees > 0 && (
                  <span className="block text-xs text-berry-700/50">cobraste {money(c.monto)} · comisión −{money(c.fees)}</span>
                )}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-cream-200/80">
              <div className="h-full rounded-full" style={{ width: `${c.pct}%`, background: c.color }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** dato corto para decidir: etiqueta, respuesta y detalle */
function Dato({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="min-w-0 rounded-2xl bg-cream-100/60 px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-berry-700/55">{label}</div>
      <div className="mt-1 truncate font-semibold">{value}</div>
      <div className="truncate text-xs text-berry-700/60">{sub}</div>
    </div>
  )
}
