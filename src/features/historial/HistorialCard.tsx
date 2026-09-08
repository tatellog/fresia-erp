import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import type { Sale } from '../../data/types'
import { round2, startOfDay } from '../../lib/format'
import { SaleSheet } from '../caja/SaleSheet'
import { Calendario, dayStartOf, monthOf } from './Calendario'
import { DiaDetalle } from './DiaDetalle'
import { PastDaysCard } from './PastDaysCard'

const DIA = 24 * 3600_000

/**
 * Historial de ventas por día: un calendario del mes con el total de cada
 * día y, al elegir uno, todo lo que pasó ese día. Abre por defecto en ayer.
 */
export function HistorialCard() {
  const [selected, setSelected] = useState(() => startOfDay(1))
  const [month, setMonth] = useState(() => monthOf(new Date(selected)))
  const [saleDetail, setSaleDetail] = useState<Sale | null>(null)
  const [capturando, setCapturando] = useState(false)

  const monthStart = month.getTime()
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 1).getTime()
  const salesMes = useLiveQuery(() => db.sales.where('ts').between(monthStart, monthEnd).toArray(), [monthStart, monthEnd])
  const salesDia = useLiveQuery(() => db.sales.where('ts').between(selected, selected + DIA).toArray(), [selected])
  const expensesDia = useLiveQuery(() => db.expenses.where('ts').between(selected, selected + DIA).toArray(), [selected])

  const totals = useMemo(() => {
    const m = new Map<number, number>()
    for (const s of salesMes ?? []) {
      const k = dayStartOf(new Date(s.ts))
      m.set(k, round2((m.get(k) ?? 0) + s.total))
    }
    return m
  }, [salesMes])

  const elegir = (ts: number) => {
    setSelected(ts)
    setCapturando(false)
  }
  const moverMes = (delta: number) => setMonth(m => new Date(m.getFullYear(), m.getMonth() + delta, 1))

  return (
    <div className="rounded-3xl border border-cream-200 bg-cream-50 p-6">
      <h2 className="mb-1 text-xl font-semibold">Historial</h2>
      <p className="mb-4 text-sm text-berry-700/70">Toca un día para ver sus ventas, gastos y retiros.</p>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <Calendario month={month} selected={selected} totals={totals} onSelect={elegir} onMonth={moverMes} />
        <div className="min-w-0">
          {salesDia && expensesDia && (
            <DiaDetalle dayStart={selected} sales={salesDia} expenses={expensesDia} onOpenSale={setSaleDetail} />
          )}

          <div className="mt-5 border-t border-cream-200 pt-4">
            <button
              onClick={() => setCapturando(v => !v)}
              className="flex w-full items-center justify-between text-left text-sm font-semibold text-berry-700"
            >
              <span>Capturar corte en papel de este día</span>
              <span className="text-berry-700/50">{capturando ? 'Ocultar' : 'Abrir'}</span>
            </button>
            {capturando && (
              <div className="mt-3">
                <PastDaysCard dayStart={selected} />
              </div>
            )}
          </div>
        </div>
      </div>

      {saleDetail && <SaleSheet sale={saleDetail} onClose={() => setSaleDetail(null)} />}
    </div>
  )
}
