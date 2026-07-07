import type { Payment } from '../../data/types'

const mostrador: { id: Payment; label: string }[] = [
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'tarjeta', label: 'Tarjeta' },
  { id: 'transferencia', label: 'Transfer.' },
]

/** apps de delivery: la plataforma cobra por ti, no entra efectivo a caja */
const delivery: { id: Payment; label: string; dot: string }[] = [
  { id: 'rappi', label: 'Rappi', dot: '#FF441F' },
  { id: 'uber', label: 'Uber Eats', dot: '#06C167' },
]

/** selector de método de cobro: mostrador y delivery */
export function PaymentPicker({ payment, setPayment }: { payment: Payment; setPayment: (p: Payment) => void }) {
  const btn = (id: Payment, label: string, dot?: string) => {
    const on = payment === id
    return (
      <button
        key={id}
        onClick={() => setPayment(id)}
        className={`flex items-center justify-center gap-1.5 rounded-full border py-2.5 text-[13px] font-medium tracking-wide transition-colors ${
          on ? 'border-berry-500 bg-berry-500 text-white' : 'border-cream-300 bg-transparent text-berry-700'
        }`}
      >
        {dot && <span className="h-2 w-2 rounded-full" style={{ background: on ? '#fff' : dot }} />}
        {label}
      </button>
    )
  }
  return (
    <div className="mb-4 space-y-2">
      <div className="grid grid-cols-3 gap-2">{mostrador.map(p => btn(p.id, p.label))}</div>
      <div className="grid grid-cols-2 gap-2">{delivery.map(p => btn(p.id, p.label, p.dot))}</div>
    </div>
  )
}
