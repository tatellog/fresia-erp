import { useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import type { Ingredient, Payment, Product } from '../data/types'
import { checkout, lineUnitPrice, voidSale, type CartLine } from '../services/sales'
import { cancelTerminalOrder, chargeOnTerminal, printTicket, waitForPayment } from '../services/mp'
import { renderTicket } from '../services/ticket'
import { productLine } from '../services/catalog'
import { money } from '../lib/format'
import { Button, Empty, Sheet } from '../components/ui'
import { ProductCard } from '../features/vender/ProductCard'
import { CartLines } from '../features/vender/CartLines'
import { PaymentPicker } from '../features/vender/PaymentPicker'
import { CashChange } from '../features/vender/CashChange'
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

/** agrupa el menú en secciones: la Frésia del mes primero, luego las líneas, bebidas y despensa; extras al final */
function sections(products: Product[]): Section[] {
  const grupo = (p: Product): LineFilter => {
    const line = productLine(p)
    return line ?? 'extras'
  }
  const defs: Omit<Section, 'items'>[] = [
    { key: 'nogada', title: 'Frésia en Nogada', dot: 'var(--line-nogada)', desc: 'Frésia del mes · edición limitada de septiembre. Fresas con crema Frèsia + nuez de Castilla y granada. · 1 topping incluido' },
    { key: 'clasica', title: 'Frésia Clásica', dot: 'var(--color-berry-500)', desc: 'Fresas frescas + nuestra crema Frèsia. · 2 toppings incluidos' },
    { key: 'uvas', title: 'Uvas', dot: 'var(--line-uva)', desc: 'Uvas verdes + crema Frèsia. · 2 toppings incluidos' },
    { key: 'mix', title: 'Mix Frésia', dot: 'var(--line-mix)', desc: 'Uvas verdes + fresas + crema Frèsia. · 2 toppings incluidos' },
    { key: 'balance', title: 'Frésia Balance', dot: 'var(--line-olive)', desc: 'Yogurt griego natural + fresas frescas. Fresca y ligera. · 2 toppings incluidos' },
    { key: 'chocolate', title: 'Frésia Chocolate', dot: 'var(--line-choco)', desc: 'Chocolate Turín + fresas frescas. · 2 toppings incluidos' },
    { key: 'brulee', title: 'Frèsia Brûlée', dot: 'var(--line-brulee)', desc: 'Crema caramelizada al momento con azúcar brûlée, finalizada con soplete. Exclusiva en tienda. · 2 toppings incluidos' },
    { key: 'waffle', title: 'Waffle Frésia', dot: 'var(--line-waffle)', desc: 'Waffle + crema Frèsia. · 2 toppings incluidos' },
    { key: 'bebidas', title: 'Bebidas', dot: 'var(--line-te)', desc: 'Té orgánico: Relajante (manzanilla y flor de manzano), Frutal (frutas y flores), Fresco (menta y hierbas) y Detox (verde, hierbas y cítricos). Agua Santa María.' },
    { key: 'despensa', title: 'Despensa', dot: 'var(--line-miel)', desc: 'Miel artesanal Palppas y pepitas Frésia para llevar a casa.' },
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
  /** con cuánto pagan en efectivo; null = sin capturar */
  const [paid, setPaid] = useState<number | null>(null)
  const [done, setDone] = useState<{ total: number; saleId: string; change?: number; ticketError?: string } | null>(null)
  /** cobro en curso en la terminal Mercado Pago */
  const [terminal, setTerminal] = useState<{ msg: string; error?: boolean; orderId?: string } | null>(null)
  const terminalOrder = useRef<string | null>(null)

  const mpTerminalId = useLiveQuery(async () => (await db.meta.get('mpTerminalId'))?.value)

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

  const pickPayment = (p: Payment) => {
    setPayment(p)
    if (p !== 'efectivo') setPaid(null)
  }

  const registrar = async () => {
    const t = total
    const lines = cart
    const pagoRecibido = payment === 'efectivo' && paid != null ? paid : undefined
    const change = payment === 'efectivo' && paid != null && paid > t ? paid - t : undefined
    const saleId = await checkout(cart, payment)
    setCart([])
    setPaying(false)
    setPaid(null)
    setDone({ total: t, saleId, change })
    setTimeout(() => setDone(d => (d?.saleId === saleId ? null : d)), change ? 12000 : 6000)
    void imprimirTicket(lines, t, pagoRecibido, change, saleId)
  }

  /** apps de delivery: el cliente no está presente y la plataforma trae su propio ticket */
  const esDelivery = (p: Payment) => p === 'rappi' || p === 'didi' || p === 'uber'

  /** imprime el ticket en la Point vinculada; nunca frena ni deshace la venta */
  const imprimirTicket = async (lines: CartLine[], t: number, pagoRecibido: number | undefined, change: number | undefined, saleId: string) => {
    if (!mpTerminalId || !navigator.onLine || esDelivery(payment)) return
    try {
      const activeId = (await db.meta.get('activeEmployeeId'))?.value
      const attendant = activeId ? (await db.employees.get(activeId))?.name : undefined
      const content = await renderTicket({
        lines, total: t, payment, paid: pagoRecibido, change, attendant, ts: Date.now(),
      })
      await printTicket(content, `ticket-${saleId}`)
    } catch (e) {
      // sin ticket no pasa nada: la venta ya quedó registrada y la fila sigue,
      // pero se avisa en la confirmación para poder revisar la impresora
      const msg = e instanceof Error ? e.message : String(e)
      setDone(d => (d?.saleId === saleId ? { ...d, ticketError: msg } : d))
    }
  }

  /** manda el cobro a la Point y registra la venta cuando el pago se confirma */
  const cobrarEnTerminal = async () => {
    setTerminal({ msg: 'Enviando el cobro a la terminal…' })
    try {
      const orderId = await chargeOnTerminal(total, `venta-${Date.now()}`)
      terminalOrder.current = orderId
      setTerminal({ msg: 'Esperando el pago en la terminal…', orderId })
      const result = await waitForPayment(orderId)
      if (terminalOrder.current !== orderId) return // se canceló desde el POS
      terminalOrder.current = null
      if (result === 'paid') {
        setTerminal(null)
        await registrar()
      } else {
        const msgs = {
          canceled: 'Cobro cancelado en la terminal',
          expired: 'El cobro expiró sin completarse',
          failed: 'El pago no se completó',
        } as const
        setTerminal({ msg: msgs[result], error: true })
      }
    } catch (e) {
      terminalOrder.current = null
      setTerminal({ msg: e instanceof Error ? e.message : String(e), error: true })
    }
  }

  const cobrar = async () => {
    if (payment === 'tarjeta' && mpTerminalId && navigator.onLine) return cobrarEnTerminal()
    await registrar()
  }

  const cancelarTerminal = async () => {
    const orderId = terminalOrder.current
    terminalOrder.current = null
    setTerminal(null)
    if (orderId) await cancelTerminalOrder(orderId).catch(() => {})
  }

  /** anula la venta recién cobrada (cobro equivocado): repone insumos y sale del corte */
  const deshacer = async () => {
    if (!done) return
    await voidSale(done.saleId)
    setDone(null)
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
              <PaymentPicker payment={payment} setPayment={pickPayment} />
              {payment === 'efectivo' && <CashChange total={total} paid={paid} setPaid={setPaid} />}
              {payment === 'tarjeta' && mpTerminalId && (
                <p className="mb-3 -mt-1 text-xs text-berry-700/50">El cobro se manda solo a la terminal Point.</p>
              )}
              <Button className="w-full py-4 text-lg" onClick={cobrar}>
                Cobrar · {money(total)}
              </Button>
              <p className="mt-3 text-center text-[11px] uppercase tracking-[0.18em] text-berry-900/35">Hechas al momento</p>
            </>
          )}
        </div>
      </aside>

      {terminal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <div className="w-full max-w-sm rounded-3xl bg-cream-50 px-6 py-6 text-center shadow-2xl">
            {!terminal.error && (
              <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-[3px] border-berry-200 border-t-berry-500" />
            )}
            <div className="font-display text-xl font-semibold">{terminal.error ? 'No se cobró' : money(total)}</div>
            <p className={`mt-1 text-sm ${terminal.error ? 'text-red-700' : 'text-berry-700/70'}`}>{terminal.msg}</p>
            {!terminal.error && terminal.orderId && (
              <p className="mt-1 text-xs text-berry-700/45">También puedes cancelar desde la terminal.</p>
            )}
            <div className="mt-4 flex justify-center gap-2">
              {terminal.error ? (
                <>
                  <Button variant="soft" onClick={() => setTerminal(null)}>Cerrar</Button>
                  <Button onClick={cobrarEnTerminal}>Reintentar</Button>
                </>
              ) : (
                <Button variant="soft" onClick={cancelarTerminal}>Cancelar cobro</Button>
              )}
            </div>
          </div>
        </div>
      )}

      {done && (
        <div className="fixed inset-x-4 top-16 z-50 mx-auto max-w-sm rounded-3xl border border-green-600/25 bg-cream-50 px-6 py-5 text-center shadow-2xl lg:top-8">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-xl text-green-700">✓</div>
          <div className="font-display text-2xl font-bold tabular-nums">{money(done.total)}</div>
          <div className="mt-0.5 text-sm text-berry-700/60">Venta registrada</div>
          {done.change != null && (
            <div className="mt-2 rounded-xl bg-berry-50 px-4 py-2 text-berry-700">
              <span className="text-sm font-medium">Cambio a devolver: </span>
              <span className="font-display text-lg font-bold tabular-nums">{money(done.change)}</span>
            </div>
          )}
          {done.ticketError && (
            <div className="mt-2 rounded-xl bg-red-50 px-3 py-1.5 text-xs text-red-700">
              No se imprimió el ticket: {done.ticketError}
            </div>
          )}
          <div className="mt-1 font-display text-sm italic text-berry-700/45">Para ti, bombón.</div>
          <button
            onClick={deshacer}
            className="mt-3 rounded-full border border-cream-300 px-4 py-1.5 text-sm font-semibold text-berry-700 active:bg-cream-100"
          >
            Deshacer
          </button>
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
        <PaymentPicker payment={payment} setPayment={pickPayment} />
        {payment === 'efectivo' && <CashChange total={total} paid={paid} setPaid={setPaid} />}
        {payment === 'tarjeta' && mpTerminalId && (
          <p className="mb-3 -mt-1 text-xs text-berry-700/50">El cobro se manda solo a la terminal Point.</p>
        )}
        <Button className="w-full py-4 text-lg" disabled={count === 0} onClick={cobrar}>
          Confirmar · {money(total)}
        </Button>
      </Sheet>
    </div>
  )
}
