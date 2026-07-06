import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import type { Ingredient, Payment, Product } from '../data/types'
import { checkout, lineUnitPrice, type CartLine } from '../services/sales'
import { money } from '../lib/format'
import { Button, Empty, Sheet } from '../components/ui'
import { ProductCard } from '../features/vender/ProductCard'
import { CartLines } from '../features/vender/CartLines'
import { PaymentPicker } from '../features/vender/PaymentPicker'
import { ToppingPickerSheet } from '../features/vender/ToppingPickerSheet'
import { AttendantChip } from '../features/vender/AttendantChip'

export default function Vender() {
  const products = useLiveQuery(() => db.products.orderBy('sort').toArray())
  const [cart, setCart] = useState<CartLine[]>([])
  const [picking, setPicking] = useState<Product | null>(null)
  const [paying, setPaying] = useState(false)
  const [payment, setPayment] = useState<Payment>('efectivo')
  const [done, setDone] = useState<number | null>(null)

  const active = useMemo(() => (products ?? []).filter(p => p.active), [products])

  const total = cart.reduce((s, l) => s + lineUnitPrice(l) * l.qty, 0)
  const count = cart.reduce((s, l) => s + l.qty, 0)
  const qtyByProduct = useMemo(() => {
    const m = new Map<string, number>()
    for (const l of cart) m.set(l.product.id, (m.get(l.product.id) ?? 0) + l.qty)
    return m
  }, [cart])

  /** agrega una unidad; funde con una línea existente si es el mismo producto y toppings */
  const addLine = (product: Product, toppings: Ingredient[]) => {
    const key = toppings.map(t => t.id).sort().join(',')
    setCart(prev => {
      const i = prev.findIndex(l => l.product.id === product.id && l.toppings.map(t => t.id).sort().join(',') === key)
      if (i >= 0) return prev.map((l, j) => (j === i ? { ...l, qty: l.qty + 1 } : l))
      return [...prev, { product, qty: 1, toppings }]
    })
  }

  const tapProduct = (p: Product) => {
    if (p.toppingGroup) setPicking(p)
    else addLine(p, [])
  }

  const setQty = (index: number, qty: number) => {
    setCart(prev => (qty <= 0 ? prev.filter((_, i) => i !== index) : prev.map((l, i) => (i === index ? { ...l, qty } : l))))
  }

  const cobrar = async () => {
    const t = total
    await checkout(cart, payment)
    setCart([])
    setPaying(false)
    setDone(t)
    setTimeout(() => setDone(null), 2200)
  }

  if (!products) return null

  return (
    <div className="pt-2 lg:flex lg:items-start lg:gap-6 lg:pt-0">
      <div className="min-w-0 flex-1">
        <AttendantChip />
        {active.length === 0 && <Empty text="Agrega productos en la pestaña Menú para empezar a vender." />}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {active.map(p => (
            <ProductCard key={p.id} product={p} qty={qtyByProduct.get(p.id) ?? 0} onTap={() => tapProduct(p)} />
          ))}
        </div>
      </div>

      {/* carrito fijo: iPad horizontal y pantallas grandes */}
      <aside className="sticky top-6 hidden w-80 shrink-0 lg:block">
        <div className="rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(174,48,40,0.08)]">
          <h2 className="mb-3 text-lg font-bold">Ticket</h2>
          {cart.length === 0 ? (
            <p className="py-8 text-center text-sm text-berry-700/50">Toca productos para agregarlos</p>
          ) : (
            <>
              <CartLines lines={cart} setQty={setQty} />
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

      {/* barra de cobro + hoja: teléfono e iPad vertical */}
      {count > 0 && (
        <div className="fixed inset-x-0 bottom-[4.25rem] z-40 mx-auto max-w-lg px-4 pb-2 md:max-w-2xl lg:hidden">
          <Button className="w-full text-lg shadow-lg" onClick={() => setPaying(true)}>
            Cobrar {count} {count === 1 ? 'artículo' : 'artículos'} · {money(total)}
          </Button>
        </div>
      )}

      {picking && (
        <ToppingPickerSheet
          product={picking}
          onConfirm={toppings => {
            addLine(picking, toppings)
            setPicking(null)
          }}
          onClose={() => setPicking(null)}
        />
      )}

      <Sheet open={paying} onClose={() => setPaying(false)} title="Cobrar">
        <CartLines lines={cart} setQty={setQty} />
        <PaymentPicker payment={payment} setPayment={setPayment} />
        <Button className="w-full text-lg" disabled={count === 0} onClick={cobrar}>
          Confirmar · {money(total)}
        </Button>
      </Sheet>
    </div>
  )
}
