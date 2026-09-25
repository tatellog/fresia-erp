import { useState } from 'react'
import { money, round2 } from '../../lib/format'
import { decimal, NumberInput } from '../../components/ui'

/** porcentajes habituales de propina en México */
const PORCENTAJES = [10, 15]

/**
 * Propina al momento de cobrar: un chip por porcentaje habitual y un
 * campo para otra cantidad. Se suma a lo que paga el cliente pero va
 * aparte de la venta: es del equipo.
 */
export function TipPicker({ total, tip, setTip }: { total: number; tip: number; setTip: (v: number) => void }) {
  const [otra, setOtra] = useState('')
  const sugeridas = PORCENTAJES.map(p => ({ p, v: round2(total * p / 100) })).filter(s => s.v > 0)
  const esSugerida = sugeridas.some(s => s.v === tip)
  const chip = (on: boolean) =>
    `rounded-full border px-3 py-2 text-[13px] font-medium tabular-nums tracking-wide transition-colors ${
      on ? 'border-berry-500 bg-berry-500 text-white' : 'border-cream-300 text-berry-700'
    }`
  return (
    <div className="mb-4">
      <p className="mb-1.5 text-sm font-medium text-berry-700/70">¿Dejan propina?</p>
      <div className="flex flex-wrap gap-2">
        <button onClick={() => { setTip(0); setOtra('') }} className={chip(tip === 0)}>
          Sin propina
        </button>
        {sugeridas.map(s => (
          <button key={s.p} onClick={() => { setTip(tip === s.v ? 0 : s.v); setOtra('') }} className={chip(tip === s.v)}>
            {s.p} % · {money(s.v)}
          </button>
        ))}
        <NumberInput
          placeholder="Otra"
          className={`min-w-[5.5rem] flex-1 text-center tabular-nums ${tip > 0 && !esSugerida ? 'border-berry-500' : ''}`}
          value={otra}
          onChange={e => {
            setOtra(e.target.value)
            setTip(Math.max(0, round2(decimal(e.target.value))))
          }}
        />
      </div>
      {tip > 0 && (
        <p className="mt-1.5 text-xs text-berry-700/55">
          La propina es del equipo: no cuenta como venta ni entra al efectivo de la caja.
        </p>
      )}
    </div>
  )
}
