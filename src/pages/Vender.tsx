import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Payment, type Product } from '../db'
import { checkout } from '../lib/logic'
import { money } from '../lib/format'
import { Button, Empty, Sheet, Stepper } from '../components/ui'

const payments: { id: Payment; label: string; icon: string }[] = [
  { id: 'efectivo', label: 'Efectivo', icon: '💵' },
  { id: 'tarjeta', label: 'Tarjeta', icon: '💳' },
  { id: 'transferencia', label: 'Transferencia', icon: '📲' },
]

interface Line {
  product: Product
  qty: number
}

export default function Vender() {
  const products = useLiveQuery(() => db.products.orderBy('sort').toArray())
  const [cart, setCart] = useState<Map<number, number>>(new Map())
  const [paying, setPaying] = useState(false)
  const [payment, setPayment] = useState<Payment>('efectivo')
  const [done, setDone] = useState<number | null>(null)

  const active = useMemo(() => (products ?? []).filter(p => p.active), [products])
  const byId = useMemo(() => new Map(active.map(p => [p.id, p])), [active])

  const lines = [...cart.entries()]
    .map(([id, qty]) => ({ product: byId.get(id), qty }))
    .filter((l): l is Line => !!l.product && l.qty > 0)
  const total = lines.reduce((s, l) => s + l.product.price * l.qty, 0)
  const count = lines.reduce((s, l) => s + l.qty, 0)

  const setQty = (id: number, qty: number) => {
    const next = new Map(cart)
    if (qty <= 0) next.delete(id)
    else next.set(id, qty)
    setCart(next)
  }

  const cobrar = async () => {
    const t = total
    await checkout(lines, payment)
    setCart(new Map())
    setPaying(false)
    setDone(t)
    setTimeout(() => setDone(null), 2200)
  }

  if (!products) return null

  return (
    <div className="pt-2 lg:flex lg:items-start lg:gap-6 lg:pt-0">
      <div className="min-w-0 flex-1">
        {active.length === 0 && <Empty emoji="🍨" text="Agrega productos en la pestaña Menú para empezar a vender." />}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {active.map(p => {
            const qty = cart.get(p.id) ?? 0
            return (
              <button
                key={p.id}
                onClick={() => setQty(p.id, qty + 1)}
                className={`rounded-2xl p-4 text-left shadow-[0_1px_3px_rgba(174,48,40,0.08)] transition-transform active:scale-95 ${
                  qty > 0 ? 'bg-berry-500 text-white' : 'bg-white'
                }`}
              >
                <div className="mb-1 flex items-start justify-between">
                  <span className="text-2xl">{p.emoji}</span>
                  {qty > 0 && (
                    <span className="rounded-full bg-white/25 px-2 py-0.5 text-sm font-bold">×{qty}</span>
                  )}
                </div>
                <div className="text-sm font-semibold leading-tight">{p.name}</div>
                <div className={`mt-1 font-bold ${qty > 0 ? 'text-white/90' : 'text-berry-500'}`}>{money(p.price)}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* carrito fijo — iPad horizontal y pantallas grandes */}
      <aside className="sticky top-6 hidden w-80 shrink-0 lg:block">
        <div className="rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(174,48,40,0.08)]">
          <h2 className="mb-3 text-lg font-bold">Ticket</h2>
          {lines.length === 0 ? (
            <p className="py-8 text-center text-sm text-berry-700/50">Toca productos para agregarlos</p>
          ) : (
            <>
              <CartLines lines={lines} setQty={setQty} />
              <PaymentPicker payment={payment} setPayment={setPayment} />
              <Button className="w-full text-lg" onClick={cobrar}>
                Cobrar · {money(total)}
              </Button>
            </>
          )}
        </div>
      </aside>

      {done !== null && (
        <div className="fixed inset-x-4 top-16 z-50 mx-auto max-w-lg rounded-2xl bg-green-600 px-4 py-3 text-center font-bold text-white shadow-lg lg:top-6">
          ✓ Venta registrada · {money(done)}
        </div>
      )}

      {/* barra de cobro + hoja — teléfono e iPad vertical */}
      {count > 0 && (
        <div className="fixed inset-x-0 bottom-[4.25rem] z-40 mx-auto max-w-lg px-4 pb-2 md:max-w-2xl lg:hidden">
          <Button className="w-full text-lg shadow-lg" onClick={() => setPaying(true)}>
            Cobrar {count} {count === 1 ? 'artículo' : 'artículos'} · {money(total)}
          </Button>
        </div>
      )}

      <Sheet open={paying} onClose={() => setPaying(false)} title="Cobrar">
        <div className="mb-4">
          <CartLines lines={lines} setQty={setQty} />
        </div>
        <PaymentPicker payment={payment} setPayment={setPayment} />
        <Button className="w-full text-lg" disabled={count === 0} onClick={cobrar}>
          Confirmar · {money(total)}
        </Button>
      </Sheet>
    </div>
  )
}

function CartLines({ lines, setQty }: { lines: Line[]; setQty: (id: number, qty: number) => void }) {
  return (
    <div className="mb-4 space-y-2">
      {lines.map(l => (
        <div key={l.product.id} className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{l.product.name}</div>
            <div className="text-xs text-berry-700/60">{money(l.product.price)} c/u</div>
          </div>
          <Stepper value={l.qty} onChange={q => setQty(l.product.id, q)} />
          <div className="w-16 text-right text-sm font-bold tabular-nums">{money(l.product.price * l.qty)}</div>
        </div>
      ))}
    </div>
  )
}

function PaymentPicker({ payment, setPayment }: { payment: Payment; setPayment: (p: Payment) => void }) {
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
