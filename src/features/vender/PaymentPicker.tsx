import type { Payment } from '../../data/types'

const payments: { id: Payment; label: string; icon: string }[] = [
  { id: 'efectivo', label: 'Efectivo', icon: '💵' },
  { id: 'tarjeta', label: 'Tarjeta', icon: '💳' },
  { id: 'transferencia', label: 'Transferencia', icon: '📲' },
]

/** selector de método de pago */
export function PaymentPicker({ payment, setPayment }: { payment: Payment; setPayment: (p: Payment) => void }) {
  return (
    <div className="mb-4 grid grid-cols-3 gap-2">
      {payments.map(p => (
        <button
          key={p.id}
          onClick={() => setPayment(p.id)}
          className={`rounded-xl px-1 py-3 text-center text-xs font-semibold sm:text-sm ${
            payment === p.id ? 'bg-berry-500 text-white' : 'bg-cream-200 text-berry-700'
          }`}
        >
          <div className="text-lg">{p.icon}</div>
          {p.label}
        </button>
      ))}
    </div>
  )
}
