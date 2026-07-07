import type { Payment } from '../../data/types'

const payments: { id: Payment; label: string }[] = [
  { id: 'efectivo', label: 'Efectivo' },
  { id: 'tarjeta', label: 'Tarjeta' },
  { id: 'transferencia', label: 'Transfer.' },
]

/** selector de método de pago */
export function PaymentPicker({ payment, setPayment }: { payment: Payment; setPayment: (p: Payment) => void }) {
  return (
    <div className="mb-4 grid grid-cols-3 gap-2">
      {payments.map(p => (
        <button
          key={p.id}
          onClick={() => setPayment(p.id)}
          className={`rounded-full border py-2.5 text-center text-[13px] font-medium tracking-wide transition-colors ${
            payment === p.id
              ? 'border-berry-500 bg-berry-500 text-white'
              : 'border-cream-300 bg-transparent text-berry-700'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}
