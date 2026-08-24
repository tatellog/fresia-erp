import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import type { Payment } from '../../data/types'
import { delta, profit, salesSummary } from '../../services/analytics'
import { money, round2, startOfDay } from '../../lib/format'
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
  { id: 'uber', label: 'Uber Eats', color: '#06C167' },
]

/**
 * Protagonista del Dashboard: cómo va el dinero. Ventas y ganancia en
 * grande con periodo de un toque, y el desglose visual por canal de cobro.
 */
export function MoneyHero({ goalMoney }: { goalMoney: number }) {
  const [periodo, setPeriodo] = useState<PeriodId>('hoy')
  const sales30 = useLiveQuery(() => db.sales.where('ts').aboveOrEqual(startOfDay(29)).toArray())

  const data = useMemo(() => {
    if (!sales30) return null
    const def = PERIODOS.find(p => p.id === periodo)!
    const desde = startOfDay(def.days - 1)
    const enPeriodo = sales30.filter(s => s.ts >= desde)
    const resumen = salesSummary(enPeriodo)
    const utilidad = profit(enPeriodo)
    const costsKnown = enPeriodo.some(s => s.cost > 0) || enPeriodo.length === 0
    const ayer = salesSummary(sales30.filter(s => s.ts >= startOfDay(1) && s.ts < startOfDay(0))).total
    const canales = CANALES.map(c => {
      const del = enPeriodo.filter(s => s.payment === c.id)
      const monto = round2(del.reduce((s, x) => s + x.total, 0))
      return { ...c, monto, cobros: del.length, pct: resumen.total > 0 ? Math.round((monto / resumen.total) * 100) : 0 }
    })
    return {
      def, resumen, utilidad, costsKnown, canales,
      deltaAyer: periodo === 'hoy' ? delta(resumen.total, ayer) : null,
      margen: resumen.total > 0 ? Math.round((utilidad.profit / resumen.total) * 100) : 0,
      promedioDiario: round2(resumen.total / def.days),
    }
  }, [sales30, periodo])

  if (!data) return null
  const { resumen, utilidad, costsKnown, canales, deltaAyer, margen } = data

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
            <div className="font-display text-[56px] font-bold leading-none tabular-nums lg:text-[68px]">{money(resumen.total)}</div>
            <div className="mt-3 flex items-center gap-3 text-sm text-berry-700/70">
              <span><b className="text-berry-900">{resumen.cups}</b> vasos · {resumen.tickets} cobros</span>
              {deltaAyer !== null && (
                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                  deltaAyer >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-600'
                }`}>
                  {deltaAyer >= 0 ? '↑' : '↓'} {Math.abs(deltaAyer)}% vs. ayer
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
                ? <>después de insumos · <b className="text-berry-900">{margen}%</b> de margen</>
                : 'registra compras de insumos para calcularla'}
            </div>
          </div>
        </div>
        <div className="w-full max-w-sm flex-1">
          {periodo === 'hoy' ? (
            <GoalProgress
              label="Meta diaria"
              valueLabel={`${money(resumen.total)} de ${money(goalMoney)}`}
              pct={goalMoney > 0 ? Math.round((resumen.total / goalMoney) * 100) : 0}
            />
          ) : (
            <div className="text-right">
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-berry-700/60">Promedio diario</div>
              <div className="mt-1.5 font-display text-[28px] font-bold tabular-nums">{money(data.promedioDiario)}</div>
            </div>
          )}
        </div>
      </div>

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
                <b>{money(c.monto)}</b> <span className="text-berry-700/60">· {c.pct}%</span>
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
