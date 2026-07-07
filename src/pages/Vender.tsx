import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import type { Ingredient, Payment, Product } from '../data/types'
import { checkout, lineUnitPrice, type CartLine } from '../services/sales'
import { productLine } from '../services/catalog'
import { money } from '../lib/format'
import { Button, Empty, Sheet } from '../components/ui'
import { ProductCard } from '../features/vender/ProductCard'
import { CartLines } from '../features/vender/CartLines'
import { PaymentPicker } from '../features/vender/PaymentPicker'
import { ToppingPickerSheet } from '../features/vender/ToppingPickerSheet'
import { AttendantChip } from '../features/vender/AttendantChip'
import { LineTabs, type LineFilter } from '../features/vender/LineTabs'

interface Section {
  key: LineFilter
  title: string
  dot: string
  desc: string
  items: Product[]
}

/** agrupa el menú en secciones: las tres líneas primero, extras al final */
function sections(products: Product[]): Section[] {
  const grupo = (p: Product): LineFilter => {
    const line = productLine(p)
    return line ?? 'extras'
  }
  const defs: Omit<Section, 'items'>[] = [
    { key: 'clasica', title: 'Frésia Clásica', dot: 'var(--color-berry-500)', desc: 'Con crema tradicional. Dulce, cremosa y hecha para consentirte. · 2 toppings incluidos' },
    { key: 'chocolate', title: 'Frésia con Chocolate', dot: 'var(--line-choco)', desc: 'Con crema tradicional + salsa de chocolate. · 2 toppings incluidos' },
    { key: 'balance', title: 'Frésia Balance', dot: 'var(--line-olive)', desc: 'Con yogurt griego natural + proteína. Fresca, ligera y nutritiva. · 2 toppings Balance incluidos' },
    { key: 'extras', title: 'Extras', dot: 'var(--color-blush)', desc: 'Se venden sueltos; dentro del vaso se ofrecen al armarlo.' },
  ]
  return defs
    .map(d => ({ ...d, items: products.filter(p => grupo(p) === d.key) }))
    .filter(d => d.items.length > 0)
}

export default function Vender() {
  const products = useLiveQuery(() => db.products.orderBy('sort').toArray())
  const [cart, setCart] = useState<CartLine[]>([])
  const [filter, setFilter] = useState<LineFilter>('todo')
  const [picking, setPicking] = useState<Product | null>(null)
  const [paying, setPaying] = useState(false)
  const [payment, setPayment] = useState<Payment>('efectivo')
  const [done, setDone] = useState<number | null>(null)

  const active = useMemo(() => (products ?? []).filter(p => p.active), [products])
  const secs = useMemo(() => sections(active), [active])
  const visibles = filter === 'todo' ? secs : secs.filter(s => s.key === filter)
  const available = useMemo(() => new Set(secs.map(s => s.key)), [secs])

  const total = cart.reduce((s, l) => s + lineUnitPrice(l) * l.qty, 0)
  const count = cart.reduce((s, l) => s + l.qty, 0)
  const qtyByProduct = useMemo(() => {
    const m = new Map<string, number>()
    for (const l of cart) m.set(l.product.id, (m.get(l.product.id) ?? 0) + l.qty)
    return m
  }, [cart])

  /** agrega una unidad; funde con una línea existente si coinciden producto, toppings y extras */
  const addLine = (product: Product, toppings: Ingredient[], extras: Product[]) => {
    const key = [...toppings.map(t => t.id), '|', ...extras.map(e => e.id)].sort().join(',')
    const keyOf = (l: CartLine) => [...l.toppings.map(t => t.id), '|', ...l.extras.map(e => e.id)].sort().join(',')
    setCart(prev => {
      const i = prev.findIndex(l => l.product.id === product.id && keyOf(l) === key)
      if (i >= 0) return prev.map((l, j) => (j === i ? { ...l, qty: l.qty + 1 } : l))
      return [...prev, { product, qty: 1, toppings, extras }]
    })
  }

  const tapProduct = (p: Product) => {
    if (p.toppingGroup) setPicking(p)
    else addLine(p, [], [])
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
    setTimeout(() => setDone(null), 2400)
  }

  if (!products) return null

  return (
    <div className="pt-2 lg:flex lg:items-start lg:gap-6 lg:pt-0">
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-center justify-between">
          <AttendantChip />
        </div>
        <LineTabs value={filter} onChange={setFilter} available={available} />
        {active.length === 0 && <Empty text="Agrega productos en la pestaña Menú para empezar a vender." />}

        {visibles.map(sec => (
          <section key={sec.key} className="mb-8">
            <h2 className="flex items-center gap-2 text-xl font-semibold">
              <span className="h-2 w-2 rounded-full" style={{ background: sec.dot }} />
              {sec.title}
            </h2>
            <p className="mb-3.5 mt-0.5 text-xs text-berry-900/50">{sec.desc}</p>
            <div className={`grid grid-cols-2 gap-3 lg:gap-4 ${
              filter === 'todo' ? 'md:grid-cols-[repeat(auto-fill,minmax(200px,1fr))]' : 'md:grid-cols-2 xl:grid-cols-4'
            }`}>
              {sec.items.map(p => (
                <ProductCard key={p.id} product={p} qty={qtyByProduct.get(p.id) ?? 0} onTap={() => tapProduct(p)} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* ticket fijo: iPad horizontal y pantallas grandes */}
      <aside className="sticky top-6 hidden w-80 shrink-0 lg:block xl:w-[22rem]">
        <div className="rounded-3xl border border-cream-200 bg-cream-50 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">Ticket</h2>
            {count > 0 && (
              <span className="rounded-full bg-berry-50 px-2.5 py-0.5 text-xs font-bold text-berry-500">
                {count} {count === 1 ? 'artículo' : 'artículos'}
              </span>
            )}
          </div>
          {cart.length === 0 ? (
            <p className="py-10 text-center font-display text-lg italic text-berry-700/45">Para ti, bombón.</p>
          ) : (
            <>
              <CartLines lines={cart} setQty={setQty} />
              <div className="mb-4 flex items-baseline justify-between border-t border-cream-200 pt-3.5">
                <span className="text-sm font-medium text-berry-700/70">Total</span>
                <span className="font-display text-[30px] font-bold tabular-nums">{money(total)}</span>
              </div>
              <PaymentPicker payment={payment} setPayment={setPayment} />
              <Button className="w-full py-4 text-lg" onClick={cobrar}>
                Cobrar · {money(total)}
              </Button>
              <p className="mt-3 text-center text-[11px] uppercase tracking-[0.18em] text-berry-900/35">Hechas al momento</p>
            </>
          )}
        </div>
      </aside>

      {done !== null && (
        <div className="fixed inset-x-4 top-16 z-50 mx-auto max-w-sm rounded-3xl border border-green-600/25 bg-cream-50 px-6 py-5 text-center shadow-2xl lg:top-8">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-xl text-green-700">✓</div>
          <div className="font-display text-2xl font-bold tabular-nums">{money(done)}</div>
          <div className="mt-0.5 text-sm text-berry-700/60">Venta registrada</div>
          <div className="mt-1 font-display text-sm italic text-berry-700/45">Para ti, bombón.</div>
        </div>
      )}

      {/* barra de cobro + hoja: teléfono e iPad vertical */}
      {count > 0 && (
        <div className="fixed inset-x-0 bottom-[4.25rem] z-40 mx-auto max-w-lg px-4 pb-2 md:max-w-2xl lg:hidden">
          <Button className="w-full py-4 text-lg shadow-lg" onClick={() => setPaying(true)}>
            Cobrar {count} {count === 1 ? 'artículo' : 'artículos'} · {money(total)}
          </Button>
        </div>
      )}

      {picking && (
        <ToppingPickerSheet
          product={picking}
          onConfirm={(toppings, extras) => {
            addLine(picking, toppings, extras)
            setPicking(null)
          }}
          onClose={() => setPicking(null)}
        />
      )}

      <Sheet open={paying} onClose={() => setPaying(false)} title="Cobrar">
        <CartLines lines={cart} setQty={setQty} />
        <div className="mb-4 flex items-baseline justify-between border-t border-cream-200 pt-3.5">
          <span className="text-sm font-medium text-berry-700/70">Total</span>
          <span className="font-display text-[30px] font-bold tabular-nums">{money(total)}</span>
        </div>
        <PaymentPicker payment={payment} setPayment={setPayment} />
        <Button className="w-full py-4 text-lg" disabled={count === 0} onClick={cobrar}>
          Confirmar · {money(total)}
        </Button>
      </Sheet>
    </div>
  )
}
