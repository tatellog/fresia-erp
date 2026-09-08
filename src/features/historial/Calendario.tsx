import { money } from '../../lib/format'

const DIAS = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

/** inicio del día local de una fecha */
export const dayStartOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

/** primer día del mes de una fecha */
export const monthOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1)

/**
 * Calendario de un mes: cada día con ventas trae su total debajo del número.
 * Los días futuros no se pueden elegir.
 */
export function Calendario({ month, selected, totals, onSelect, onMonth }: {
  month: Date
  selected: number
  /** total vendido por día (llave: inicio del día) */
  totals: Map<number, number>
  onSelect: (dayStart: number) => void
  onMonth: (delta: number) => void
}) {
  const hoy = dayStartOf(new Date())
  const primero = monthOf(month)
  const diasEnMes = new Date(primero.getFullYear(), primero.getMonth() + 1, 0).getDate()
  // lunes primero: getDay() da 0 para domingo
  const huecos = (primero.getDay() + 6) % 7
  const celdas: (number | null)[] = [
    ...Array.from({ length: huecos }, () => null),
    ...Array.from({ length: diasEnMes }, (_, i) => new Date(primero.getFullYear(), primero.getMonth(), i + 1).getTime()),
  ]
  const esMesActual = primero.getFullYear() === new Date().getFullYear() && primero.getMonth() === new Date().getMonth()
  const mes = primero.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })
  const titulo = mes.charAt(0).toUpperCase() + mes.slice(1)

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          onClick={() => onMonth(-1)}
          aria-label="Mes anterior"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-cream-300 text-berry-700 active:bg-cream-100"
        >
          ‹
        </button>
        <span className="font-display text-xl font-semibold">{titulo}</span>
        <button
          onClick={() => onMonth(1)}
          disabled={esMesActual}
          aria-label="Mes siguiente"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-cream-300 text-berry-700 active:bg-cream-100 disabled:opacity-30"
        >
          ›
        </button>
      </div>
      <div className="mb-1 grid grid-cols-7 text-center text-[11px] font-semibold uppercase tracking-wide text-berry-700/50">
        {DIAS.map((d, i) => <span key={i}>{d}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {celdas.map((ts, i) => {
          if (ts === null) return <span key={`h${i}`} />
          const total = totals.get(ts) ?? 0
          const futuro = ts > hoy
          const activo = ts === selected
          return (
            <button
              key={ts}
              disabled={futuro}
              onClick={() => onSelect(ts)}
              className={`flex min-h-[52px] flex-col items-center justify-center rounded-xl border py-1 transition-colors ${
                activo
                  ? 'border-berry-500 bg-berry-500 text-white shadow-sm'
                  : futuro
                    ? 'border-transparent text-berry-700/25'
                    : total > 0
                      ? 'border-cream-200 bg-cream-100/70 text-berry-900 active:bg-cream-200'
                      : 'border-transparent text-berry-700/60 active:bg-cream-100'
              } ${ts === hoy && !activo ? 'ring-1 ring-berry-400' : ''}`}
            >
              <span className="text-sm font-semibold tabular-nums leading-none">{new Date(ts).getDate()}</span>
              {total > 0 && (
                <span className={`mt-1 text-[10px] font-medium tabular-nums leading-none ${activo ? 'text-white/85' : 'text-berry-700/60'}`}>
                  {money(total)}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
