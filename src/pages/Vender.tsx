import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import type { Payment, Product } from '../data/types'
import { checkout, type CartLine } from '../services/sales'
import { money } from '../lib/format'
import { Button, Empty, Sheet } from '../components/ui'
import { ProductCard } from '../features/vender/ProductCard'
import { CartLines } from '../features/vender/CartLines'
import { PaymentPicker } from '../features/vender/PaymentPicker'

export default function Vender() {
  const products = useLiveQuery(() => db.products.orderBy('sort').toArray())
  const [cart, setCart] = useState<Map<string, number>>(new Map())
  const [paying, setPaying] = useState(false)
  const [payment, setPayment] = useState<Payment>('efectivo')
  const [done, setDone] = useState<number | null>(null)

  const active = useMemo(() => (products ?? []).filter(p => p.active), [products])
  const byId = useMemo(() => new Map(active.map(p => [p.id, p])), [active])

  const lines = [...cart.entries()]
    .map(([id, qty]) => ({ product: byId.get(id), qty }))
    .filter((l): l is CartLine => !!l.product && l.qty > 0)
  const total = lines.reduce((s, l) => s + l.product.price * l.qty, 0)
  const count = lines.reduce((s, l) => s + l.qty, 0)

  const setQty = (id: string, qty: number) => {
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
          {active.map((p: Product) => (
            <ProductCard key={p.id} product={p} qty={cart.get(p.id) ?? 0} onTap={() => setQty(p.id, (cart.get(p.id) ?? 0) + 1)} />
          ))}
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
        <CartLines lines={lines} setQty={setQty} />
        <PaymentPicker payment={payment} setPayment={setPayment} />
        <Button className="w-full text-lg" disabled={count === 0} onClick={cobrar}>
          Confirmar · {money(total)}
        </Button>
      </Sheet>
    </div>
  )
}
