import { Fragment } from 'react'
import { fmtTime, fmtWeekday, money, startOfDay } from '../../lib/format'

export interface CashMovement {
  ts: number
  label: string
  amount: number | null
  /** verde entradas, rojo salidas, gris informativos */
  tone: 'in' | 'out' | 'info'
  tag?: string
  /** presente cuando el movimiento se puede abrir (ventas: corregir o anular; gastos: ver el detalle) */
  onTap?: () => void
}

const toneText = { in: 'text-green-700', out: 'text-red-600', info: 'text-berry-700/50' }
const toneDot = { in: 'bg-green-600', out: 'bg-red-600', info: 'bg-cream-300' }

/** línea de tiempo de los movimientos del turno, separada por día: el corte es semanal */
export function CashMovementTimeline({ movements }: { movements: CashMovement[] }) {
  return (
    <div className="rounded-3xl border border-cream-200 bg-cream-50 p-6">
      <h2 className="mb-4 text-xl font-semibold">Movimientos del turno</h2>
      {movements.length === 0 && (
        <p className="py-6 text-center text-sm text-berry-700/50">Aún no hay movimientos en este turno.</p>
      )}
      <div className="space-y-0">
        {movements.map((m, i) => {
          const Row = m.onTap ? 'button' : 'div'
          const dia = new Date(m.ts).toDateString()
          const nuevoDia = i === 0 || new Date(movements[i - 1].ts).toDateString() !== dia
          return (
            <Fragment key={i}>
            {nuevoDia && (
              <div className={`pb-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-berry-500 ${i > 0 ? 'pt-5' : ''}`}>
                {m.ts >= startOfDay(0) ? 'Hoy' : m.ts >= startOfDay(1) ? 'Ayer' : fmtWeekday(m.ts)}
              </div>
            )}
            <Row
              onClick={m.onTap}
              className={`flex w-full items-center gap-4 py-3.5 text-left ${!nuevoDia ? 'border-t border-cream-200/70' : ''} ${
                m.onTap ? 'cursor-pointer transition-colors hover:bg-cream-100/60 active:bg-cream-100' : ''
              }`}
            >
              <span className="w-14 shrink-0 text-sm tabular-nums text-berry-700/55">{fmtTime(m.ts)}</span>
              <span className={`h-2 w-2 shrink-0 rounded-full ${toneDot[m.tone]}`} />
              <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{m.label}</span>
              {m.tag && (
                <span className="rounded-full bg-cream-200/70 px-2.5 py-0.5 text-xs capitalize text-berry-700/70">{m.tag}</span>
              )}
              {m.amount !== null && (
                <span className={`w-24 shrink-0 text-right font-semibold tabular-nums ${toneText[m.tone]}`}>
                  {m.tone === 'out' ? '−' : m.tone === 'in' ? '+' : ''}{money(Math.abs(m.amount))}
                </span>
              )}
            </Row>
            </Fragment>
          )
        })}
      </div>
    </div>
  )
}
