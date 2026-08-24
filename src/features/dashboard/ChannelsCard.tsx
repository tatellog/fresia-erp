import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import type { Payment } from '../../data/types'
import { money, round2, startOfDay } from '../../lib/format'

const PERIODOS = [
  { id: 'hoy', label: 'Hoy', days: 0 },
  { id: '7d', label: '7 días', days: 6 },
  { id: 'quincena', label: 'Quincena', days: 14 },
  { id: 'mes', label: 'Mes', days: 29 },
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

/** cómo te han pagado: total y desglose por canal, con periodo de un toque */
export function ChannelsCard() {
  const [periodo, setPeriodo] = useState<PeriodId>('hoy')
  const sales30 = useLiveQuery(() => db.sales.where('ts').aboveOrEqual(startOfDay(29)).toArray())

  const { total, cobros, rows } = useMemo(() => {
    const days = PERIODOS.find(p => p.id === periodo)!.days
    const desde = startOfDay(days)
    const enPeriodo = (sales30 ?? []).filter(s => s.ts >= desde)
    const acc = new Map<Payment, { monto: number; cobros: number }>()
    for (const s of enPeriodo) {
      const prev = acc.get(s.payment) ?? { monto: 0, cobros: 0 }
      acc.set(s.payment, { monto: prev.monto + s.total, cobros: prev.cobros + 1 })
    }
    const total = round2(enPeriodo.reduce((s, x) => s + x.total, 0))
    return {
      total,
      cobros: enPeriodo.length,
      rows: CANALES.map(c => {
        const d = acc.get(c.id) ?? { monto: 0, cobros: 0 }
        return { ...c, monto: round2(d.monto), cobros: d.cobros, pct: total > 0 ? Math.round((d.monto / total) * 100) : 0 }
      }),
    }
  }, [sales30, periodo])

  if (!sales30) return null

  return (
    <div className="rounded-3xl border border-cream-200 bg-cream-50 p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">¿Cómo te pagaron?</h2>
        <div className="flex gap-1.5">
          {PERIODOS.map(p => (
            <button
              key={p.id}
              onClick={() => setPeriodo(p.id)}
              className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold transition-colors ${
                periodo === p.id ? 'border-berry-500 bg-berry-500 text-white' : 'border-cream-300 text-berry-700/70'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-5 flex items-baseline gap-3">
        <span className="font-display text-[40px] font-bold leading-none tabular-nums">{money(total)}</span>
        <span className="text-sm text-berry-700/60">{cobros} {cobros === 1 ? 'cobro' : 'cobros'}</span>
      </div>

      <div className="space-y-3.5">
        {rows.map(r => (
          <div key={r.id} className={r.monto === 0 ? 'opacity-40' : ''}>
            <div className="mb-1 flex items-baseline justify-between text-sm">
              <span className="flex items-center gap-2 font-medium">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />
                {r.label}
                {r.monto > 0 && <span className="text-xs text-berry-700/50">· {r.cobros}</span>}
              </span>
              <span className="tabular-nums">
                <b>{money(r.monto)}</b> <span className="text-berry-700/60">· {r.pct}%</span>
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-cream-200/80">
              <div className="h-full rounded-full" style={{ width: `${r.pct}%`, background: r.color }} />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-berry-700/50">
        Quincena y mes son los últimos 15 y 30 días. Incluye ventas del POS y días capturados a mano.
      </p>
    </div>
  )
}
