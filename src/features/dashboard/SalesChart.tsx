import { useState } from 'react'
import { money, fmtDate } from '../../lib/format'

export interface DayPoint {
  ts: number
  total: number
}

const W = 660
const H = 190
const PAD = { top: 26, right: 8, bottom: 22, left: 8 }

/**
 * Ventas por día (14 días): barras delgadas en rojo Frésia con extremos
 * redondeados, cuadrícula recesiva, etiqueta directa solo en el máximo y
 * en hoy, y tooltip al pasar el dedo o el cursor.
 */
export function SalesChart({ days }: { days: DayPoint[] }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(...days.map(d => d.total), 1)
  const iMax = days.findIndex(d => d.total === max)
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom
  const step = innerW / days.length
  const barW = Math.min(26, step * 0.62)

  const y = (v: number) => PAD.top + innerH * (1 - v / max)

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Ventas de los últimos 14 días">
        {[0.5, 1].map(f => (
          <line key={f} x1={PAD.left} x2={W - PAD.right} y1={y(max * f)} y2={y(max * f)}
            stroke="var(--color-cream-200)" strokeWidth="1" />
        ))}
        {days.map((d, i) => {
          const x = PAD.left + i * step + (step - barW) / 2
          const isToday = i === days.length - 1
          const h = Math.max(2, innerH * (d.total / max))
          const showLabel = (i === iMax || isToday) && d.total > 0
          return (
            <g key={d.ts}
              onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
              onTouchStart={() => setHover(i)}>
              {/* zona de toque más amplia que la barra */}
              <rect x={PAD.left + i * step} y={PAD.top} width={step} height={innerH + PAD.bottom} fill="transparent" />
              <rect
                x={x} y={y(d.total)} width={barW} height={h} rx="4"
                fill="var(--color-berry-500)"
                opacity={hover === null || hover === i ? (isToday ? 1 : 0.82) : 0.35}
              />
              {showLabel && (
                <text x={x + barW / 2} y={y(d.total) - 7} textAnchor="middle"
                  fontSize="11" fontWeight="600" fill="var(--color-berry-900)" opacity="0.75">
                  {money(d.total)}
                </text>
              )}
              <text x={x + barW / 2} y={H - 6} textAnchor="middle" fontSize="9.5"
                fill="var(--color-berry-900)" opacity={isToday ? 0.8 : 0.4}
                fontWeight={isToday ? 700 : 400}>
                {isToday ? 'Hoy' : fmtDate(d.ts).split(' ')[0]}
              </text>
            </g>
          )
        })}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute -top-1 rounded-lg bg-berry-900 px-2.5 py-1.5 text-xs font-medium text-cream-50 shadow-lg"
          style={{ left: `${((hover + 0.5) / days.length) * 100}%`, transform: 'translateX(-50%)' }}
        >
          {fmtDate(days[hover].ts)} · {money(days[hover].total)}
        </div>
      )}
    </div>
  )
}
