import type { ExpensePayment } from '../../data/types'

/** 'fuera' = la pagó alguien de su bolsa: no se registra en la caja */
export type PurchasePayment = ExpensePayment | 'fuera'

const OPCIONES: { id: PurchasePayment; label: string; desc: string }[] = [
  { id: 'efectivo', label: 'Efectivo', desc: 'Sale del efectivo de la caja.' },
  { id: 'tarjeta', label: 'Tarjeta', desc: 'Queda como gasto del turno; no toca el efectivo del cajón.' },
  { id: 'transferencia', label: 'Transfer.', desc: 'Queda como gasto del turno; no toca el efectivo del cajón.' },
  { id: 'fuera', label: 'Fuera de caja', desc: 'Solo entra al inventario: la pagó alguien de su bolsa.' },
]

/** con qué se pagó una compra o un gasto; explica qué pasa con la caja en cada caso */
export function ExpensePaymentPicker({ value, onChange, allowOutside = false }: {
  value: PurchasePayment
  onChange: (p: PurchasePayment) => void
  allowOutside?: boolean
}) {
  const opciones = OPCIONES.filter(o => allowOutside || o.id !== 'fuera')
  const actual = OPCIONES.find(o => o.id === value)
  return (
    <div className="mb-3">
      <p className="mb-1.5 text-sm font-medium text-berry-700">¿Cómo se pagó?</p>
      <div className={`grid gap-2 ${opciones.length === 4 ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {opciones.map(o => {
          const on = value === o.id
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => onChange(o.id)}
              className={`rounded-full border py-2.5 text-[13px] font-medium tracking-wide transition-colors ${
                on ? 'border-berry-500 bg-berry-500 text-white' : 'border-cream-300 bg-transparent text-berry-700'
              }`}
            >
              {o.label}
            </button>
          )
        })}
      </div>
      {actual && <p className="mt-1.5 text-xs text-berry-700/55">{actual.desc}</p>}
    </div>
  )
}
