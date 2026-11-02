import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import type { Expense, Payment } from '../../data/types'
import { Sheet } from '../../components/ui'
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
  const [verGastos, setVerGastos] = useState(false)
  // dos meses: el periodo más largo y el anterior del mismo largo para comparar
  const sales30 = useLiveQuery(() => db.sales.where('ts').aboveOrEqual(startOfDay(59)).toArray())
  const gastos30 = useLiveQuery(() => db.expenses.where('ts').aboveOrEqual(startOfDay(59)).toArray())

  const data = useMemo(() => {
    if (!sales30 || !gastos30) return null
    const def = PERIODOS.find(p => p.id === periodo)!
    const desde = startOfDay(def.days - 1)
    const enPeriodo = sales30.filter(s => s.ts >= desde)
    const resumen = salesSummary(enPeriodo)
    const utilidad = profit(enPeriodo)
    // gastos reales del periodo (los retiros no son gastos, solo mueven efectivo)
    const gastosDelPeriodo = gastos30.filter(g => g.ts >= desde && g.kind !== 'retiro')
    const gastosPeriodo = round2(gastosDelPeriodo.reduce((s, g) => s + g.amount, 0))
    const netoReal = round2(resumen.net - gastosPeriodo)
    // dónde quedó la ganancia: lo cobrado en efectivo menos lo gastado en efectivo; el resto está en Mercado Pago
    const ventasEfectivo = round2(enPeriodo.filter(s => s.payment === 'efectivo').reduce((s, x) => s + x.total, 0))
    const gastosEfectivo = round2(gastosDelPeriodo.filter(g => (g.payment ?? 'efectivo') === 'efectivo').reduce((s, g) => s + g.amount, 0))
    const efectivoNeto = round2(ventasEfectivo - gastosEfectivo)
    const bancoNeto = round2(netoReal - efectivoNeto)
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
      def, resumen, utilidad, canales, gastosPeriodo, netoReal, efectivoNeto, bancoNeto,
      gastosLista: [...gastosDelPeriodo].sort((a, b) => b.ts - a.ts),
      actual, anterior, top, extremos, mejorCanal,
      cambio: pctChange(actual.net, anterior.net),
      explicacion: explainChange(actual, anterior),
      margenNeto: resumen.total > 0 ? Math.round((netoReal / resumen.total) * 100) : 0,
      promedioDiario: round2(resumen.net / def.days),
    }
  }, [sales30, gastos30, periodo])

  if (!data) return null
  const { resumen, utilidad, canales, gastosPeriodo, netoReal, efectivoNeto, bancoNeto, gastosLista, margenNeto, actual, anterior, top, extremos, mejorCanal, cambio } = data
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
            <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-berry-700/60">Ganancia neta</div>
            <div className={`mt-2 font-display text-[40px] font-bold leading-none tabular-nums lg:text-[48px] ${netoReal >= 0 ? 'text-green-700' : 'text-red-600'}`}>
              {money(netoReal)}
            </div>
            <div className="mt-3 text-sm text-berry-700/70">
              de cada <b className="text-berry-900">$100</b> que vendes te quedas <b className="text-berry-900">${margenNeto}</b>
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

      {/* la cuenta, clarita: qué entró, qué salió y qué te queda */}
      <div className="mt-7 rounded-2xl bg-cream-100/60 px-5 py-4">
        <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
          <Paso label="Cobraste" value={money(resumen.total)} />
          <Signo>−</Signo>
          <Paso label="Comisión de tarjeta" value={money(utilidad.fees)} />
          <Signo>−</Signo>
          <Paso label="Gastos y compras" value={money(gastosPeriodo)} onClick={() => setVerGastos(true)} />
          <Signo>=</Signo>
          <Paso label="Te queda" value={money(netoReal)} strong negative={netoReal < 0} />
        </div>
        {resumen.tickets > 0 && (
          <p className="mt-3 border-t border-cream-200 pt-3 text-sm text-berry-700/75">
            Dónde quedó: <b className="text-berry-900">{money(bancoNeto)}</b> en Mercado Pago (tarjeta, transferencias y apps) y{' '}
            <b className="text-berry-900">{money(efectivoNeto)}</b> en efectivo.
          </p>
        )}
      </div>

      <GastosSheet
        open={verGastos}
        onClose={() => setVerGastos(false)}
        titulo={periodo === 'hoy' ? 'Gastos de hoy' : `Gastos · últimos ${data.def.days} días`}
        gastos={gastosLista}
        total={gastosPeriodo}
      />

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
            label="Utilidad por recetas"
            value={actual.costsKnown ? moneyInt(actual.profit) : '·'}
            change={actual.costsKnown && anterior.costsKnown ? pctChange(actual.profit, anterior.profit) : null}
            hint={actual.costsKnown ? 'solo resta ingredientes, no gastos' : 'faltan compras de insumos'}
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

/** un paso de la cuenta del periodo: etiqueta arriba y cifra abajo; con onClick se vuelve tocable */
function Paso({ label, value, strong = false, negative = false, onClick }: {
  label: string; value: string; strong?: boolean; negative?: boolean; onClick?: () => void
}) {
  const contenido = (
    <>
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-berry-700/55">{label}</div>
      <div className={`mt-0.5 tabular-nums ${strong ? `font-display text-2xl font-bold ${negative ? 'text-red-600' : 'text-green-700'}` : 'text-lg font-semibold text-berry-900'} ${onClick ? 'underline decoration-berry-300 decoration-dotted underline-offset-4' : ''}`}>
        {value}
      </div>
      {onClick && <div className="mt-0.5 text-[11px] font-medium text-berry-500">ver detalle</div>}
    </>
  )
  if (onClick) return <button type="button" onClick={onClick} className="text-left">{contenido}</button>
  return <div>{contenido}</div>
}

const PAGO_LABEL: Record<string, string> = { efectivo: 'Efectivo', tarjeta: 'Tarjeta', transferencia: 'Transferencia' }

/** detalle de los gastos del periodo: por día, con forma de pago y totales */
function GastosSheet({ open, onClose, titulo, gastos, total }: {
  open: boolean; onClose: () => void; titulo: string; gastos: Expense[]; total: number
}) {
  const dias = useMemo(() => {
    const porDia = new Map<string, { label: string; total: number; items: Expense[] }>()
    for (const g of gastos) {
      const d = new Date(g.ts)
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
      if (!porDia.has(key)) {
        const label = d.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })
        porDia.set(key, { label: label.charAt(0).toUpperCase() + label.slice(1), total: 0, items: [] })
      }
      const dia = porDia.get(key)!
      dia.items.push(g)
      dia.total = round2(dia.total + g.amount)
    }
    return [...porDia.values()]
  }, [gastos])
  const porPago = useMemo(() =>
    (['efectivo', 'tarjeta', 'transferencia'] as const)
      .map(p => ({ id: p, total: round2(gastos.filter(g => (g.payment ?? 'efectivo') === p).reduce((s, g) => s + g.amount, 0)) }))
      .filter(p => p.total > 0),
  [gastos])

  return (
    <Sheet open={open} onClose={onClose} title={titulo}>
      {gastos.length === 0 ? (
        <p className="py-6 text-center text-sm text-berry-700/60">Sin gastos en este periodo.</p>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap gap-2">
            {porPago.map(p => (
              <span key={p.id} className="rounded-full bg-cream-200/80 px-3 py-1 text-xs font-semibold text-berry-700 tabular-nums">
                {PAGO_LABEL[p.id]} · {money(p.total)}
              </span>
            ))}
          </div>
          <div className="space-y-5">
            {dias.map(d => (
              <div key={d.label}>
                <div className="mb-2 flex items-baseline justify-between gap-3">
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-berry-700/55">{d.label}</span>
                  <span className="text-xs font-semibold tabular-nums text-berry-700/70">{money(d.total)}</span>
                </div>
                <div className="space-y-1.5">
                  {d.items.map(g => (
                    <div key={g.id} className="flex items-center justify-between gap-3 rounded-xl bg-cream-100/70 px-4 py-2.5">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{g.concept}</div>
                        <div className="text-xs text-berry-700/55">{PAGO_LABEL[g.payment ?? 'efectivo']}</div>
                      </div>
                      <div className="shrink-0 text-sm font-semibold tabular-nums">−{money(g.amount)}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex items-baseline justify-between border-t border-cream-200 pt-4">
            <span className="text-sm font-semibold">Total del periodo</span>
            <span className="font-display text-xl font-bold tabular-nums">−{money(total)}</span>
          </div>
        </>
      )}
    </Sheet>
  )
}

function Signo({ children }: { children: string }) {
  return <span className="self-center text-xl font-light text-berry-700/40">{children}</span>
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
