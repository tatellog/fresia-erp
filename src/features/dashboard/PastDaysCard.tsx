import { useEffect, useMemo, useState } from 'react'
import type { Payment } from '../../data/types'
import { deleteDayRecon, getDayPosTotal, getDayRecon, saveDayRecon, type DayAmounts } from '../../services/history'
import { money } from '../../lib/format'
import { Button, Field, Input } from '../../components/ui'

const METODOS: { id: Payment; label: string }[] = [
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'tarjeta', label: 'Tarjeta' },
  { id: 'transferencia', label: 'Transferencia' },
  { id: 'rappi', label: 'Rappi' },
  { id: 'didi', label: 'DiDi' },
  { id: 'uber', label: 'Uber Eats' },
]

const dateStr = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const ayer = () => { const d = new Date(); d.setDate(d.getDate() - 1); return dateStr(d) }

/** captura, corrección y borrado de días pasados (cortes en papel) por forma de pago */
export function PastDaysCard() {
  const [fecha, setFecha] = useState(ayer)
  const [montos, setMontos] = useState<Record<Payment, string>>({ efectivo: '', tarjeta: '', transferencia: '', rappi: '', uber: '', didi: '' })
  const [existente, setExistente] = useState(false)
  const [posTotal, setPosTotal] = useState(0)
  const [status, setStatus] = useState('')

  const dayStart = useMemo(() => new Date(`${fecha}T00:00:00`).getTime(), [fecha])

  useEffect(() => {
    if (!fecha) return
    setStatus('')
    Promise.all([getDayRecon(dayStart), getDayPosTotal(dayStart)]).then(([recon, pos]) => {
      const next = { efectivo: '', tarjeta: '', transferencia: '', rappi: '', uber: '', didi: '' } as Record<Payment, string>
      for (const m of METODOS) if (recon[m.id]) next[m.id] = String(recon[m.id])
      setMontos(next)
      setExistente(Object.keys(recon).length > 0)
      setPosTotal(pos)
    })
  }, [dayStart, fecha])

  const amounts = useMemo(() => {
    const out: DayAmounts = {}
    for (const m of METODOS) {
      const v = parseFloat(montos[m.id])
      if (v > 0) out[m.id] = v
    }
    return out
  }, [montos])
  const total = Object.values(amounts).reduce((s, v) => s + v, 0)

  const guardar = async () => {
    await saveDayRecon(dayStart, amounts)
    setExistente(total > 0)
    setStatus(`✓ Día guardado (${money(total)})`)
  }

  const borrar = async () => {
    if (!confirm('¿Borrar lo capturado a mano de este día? Las ventas hechas en el POS no se tocan.')) return
    await deleteDayRecon(dayStart)
    setMontos({ efectivo: '', tarjeta: '', transferencia: '', rappi: '', uber: '', didi: '' })
    setExistente(false)
    setStatus('✓ Día borrado')
  }

  return (
    <div className="rounded-3xl border border-cream-200 bg-cream-50 p-6">
      <h2 className="mb-1 text-xl font-semibold">Días pasados</h2>
      <p className="mb-4 text-sm text-berry-700/70">
        ¿Un día quedó vacío o con montos equivocados? Captura aquí el corte en papel por forma de pago.
        Siempre puedes corregirlo o borrarlo; las ventas hechas en el POS no se tocan.
      </p>
      <Field label="Día">
        <Input type="date" value={fecha} max={dateStr(new Date())} onChange={e => setFecha(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-x-3 sm:grid-cols-3">
        {METODOS.map(m => (
          <Field key={m.id} label={`${m.label} ($)`}>
            <Input
              type="number" inputMode="decimal" min={0} placeholder="0"
              value={montos[m.id]}
              onChange={e => setMontos(prev => ({ ...prev, [m.id]: e.target.value }))}
            />
          </Field>
        ))}
      </div>
      {posTotal > 0 && (
        <p className="mb-3 rounded-xl bg-cream-200/60 px-3 py-2 text-xs text-berry-700/70">
          Ese día también tiene {money(posTotal)} vendidos desde el POS; lo que captures aquí se suma aparte.
        </p>
      )}
      <div className="mb-3 flex items-baseline justify-between rounded-xl bg-cream-200 px-4 py-2.5">
        <span className="text-sm font-medium">Total del día capturado</span>
        <span className="font-display text-xl font-bold tabular-nums">{money(total)}</span>
      </div>
      <div className="flex gap-2">
        <Button className="flex-1" disabled={total <= 0 || !fecha} onClick={guardar}>
          {existente ? 'Guardar cambios' : 'Guardar día'}
        </Button>
        {existente && (
          <Button variant="soft" className="flex-1" onClick={borrar}>Borrar día</Button>
        )}
      </div>
      {status && <p className="mt-2 text-sm font-semibold">{status}</p>}
    </div>
  )
}
