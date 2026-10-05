import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import type { Ingredient } from '../../data/types'
import { openCashSession } from '../../services/cash'
import { recentPurchases, registerPurchaseBatch } from '../../services/inventory'
import { bulkUnit, fmtUnitCost } from '../../services/units'
import { money } from '../../lib/format'
import { Button, decimal, Field, Input, NumberInput, Sheet } from '../../components/ui'
import { ExpensePaymentPicker, type PurchasePayment } from '../caja/ExpensePaymentPicker'

interface Linea {
  key: number
  ingredientId: string
  qty: string
  /** captura en kg o L en vez de g o ml */
  bulk: boolean
  cost: string
}

const hoyISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

let siguiente = 1
const nueva = (ingredientId = '', qty = '', cost = '', bulk = true): Linea => ({ key: siguiente++, ingredientId, qty, cost, bulk })

/**
 * Una compra completa en un solo paso: proveedor, fecha, varios insumos y
 * cómo se pagó. Al guardar sube el inventario, recalcula el costo promedio
 * de cada insumo (y con él recetas y márgenes) y deja un solo gasto.
 */
export function RegistrarCompraSheet({ ingredientId, onClose }: { ingredientId?: string; onClose: () => void }) {
  const ingredients = useLiveQuery(() => db.ingredients.orderBy('name').toArray())
  const pasadas = useLiveQuery(() => recentPurchases(60))
  const session = useLiveQuery(async () => (await openCashSession()) ?? null)
  const [supplier, setSupplier] = useState('')
  const [fecha, setFecha] = useState(hoyISO())
  const [lineas, setLineas] = useState<Linea[]>(() => [nueva(ingredientId)])
  const [payment, setPayment] = useState<PurchasePayment>('efectivo')
  const [guardando, setGuardando] = useState(false)

  const ingMap = useMemo(() => new Map((ingredients ?? []).map(i => [i.id, i])), [ingredients])

  // la última compra de cada proveedor, para repetirla cambiando solo cantidades o precios
  const frecuentes = useMemo(() => {
    const vistos = new Set<string>()
    return (pasadas ?? []).filter(g => {
      const k = g.supplier?.trim().toLowerCase()
      if (!k || vistos.has(k)) return false
      vistos.add(k)
      return true
    }).slice(0, 4)
  }, [pasadas])
  const proveedores = useMemo(
    () => [...new Set((pasadas ?? []).map(g => g.supplier?.trim()).filter(Boolean) as string[])],
    [pasadas],
  )

  if (!ingredients || pasadas === undefined || session === undefined) return null

  const set = (key: number, patch: Partial<Linea>) => setLineas(ls => ls.map(l => (l.key === key ? { ...l, ...patch } : l)))
  const quitar = (key: number) => setLineas(ls => (ls.length === 1 ? [nueva()] : ls.filter(l => l.key !== key)))

  const repetir = (g: (typeof frecuentes)[number]) => {
    setSupplier(g.supplier ?? '')
    setLineas(g.lines.filter(p => ingMap.has(p.ingredientId)).map(p => {
      const ing = ingMap.get(p.ingredientId)!
      const bulk = !!bulkUnit(ing.unit) && p.qty >= 1000 && p.qty % 100 === 0
      const qty = bulk ? p.qty / 1000 : p.qty
      return nueva(p.ingredientId, String(qty), String(p.totalCost), bulk)
    }))
  }

  const qtyBase = (l: Linea, ing?: Ingredient) => decimal(l.qty) * (ing && l.bulk && bulkUnit(ing.unit) ? 1000 : 1)
  const completas = lineas.filter(l => ingMap.has(l.ingredientId) && decimal(l.qty) > 0 && decimal(l.cost) >= 0 && l.cost.trim() !== '')
  const total = completas.reduce((a, l) => a + decimal(l.cost), 0)
  const repetidos = new Set(lineas.map(l => l.ingredientId).filter((id, i, arr) => id && arr.indexOf(id) !== i))
  const valid = completas.length > 0 && completas.length === lineas.filter(l => l.ingredientId || l.qty || l.cost).length && repetidos.size === 0

  const guardar = async () => {
    setGuardando(true)
    try {
      const [y, m, d] = fecha.split('-').map(Number)
      const esHoy = fecha === hoyISO()
      const ts = esHoy ? Date.now() : new Date(y, m - 1, d, 12).getTime()
      const fuera = payment === 'fuera'
      await registerPurchaseBatch({
        lines: completas.map(l => ({ ingredientId: l.ingredientId, qty: qtyBase(l, ingMap.get(l.ingredientId)), totalCost: decimal(l.cost) })),
        supplier,
        ts,
        expense: !fuera,
        // solo una compra de hoy con la caja abierta cuenta en el turno
        sessionId: !fuera && esHoy && session ? session.id : undefined,
        payment: fuera ? 'efectivo' : payment,
      })
      onClose()
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Sheet open onClose={onClose} title="Registrar compra">
      {frecuentes.length > 0 && (
        <div className="mb-4">
          <p className="mb-1.5 text-sm font-medium text-berry-700">Repetir una compra</p>
          <div className="flex flex-wrap gap-2">
            {frecuentes.map(g => (
              <button
                key={g.id}
                type="button"
                onClick={() => repetir(g)}
                className="rounded-full border border-cream-300 px-3.5 py-1.5 text-[13px] text-berry-700 transition-colors active:bg-cream-200"
              >
                {g.supplier} <span className="text-berry-700/50">· {g.lines.length} {g.lines.length === 1 ? 'insumo' : 'insumos'}</span>
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-berry-700/55">Llena los insumos de la última vez; solo ajusta cantidades y precios.</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Field label="Proveedor">
          <Input value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="Costco, mercado…" list="proveedores" />
          <datalist id="proveedores">
            {proveedores.map(p => <option key={p} value={p} />)}
          </datalist>
        </Field>
        <Field label="Fecha">
          <Input type="date" value={fecha} max={hoyISO()} onChange={e => setFecha(e.target.value || hoyISO())} />
        </Field>
      </div>

      <p className="mb-1.5 text-sm font-medium text-berry-700">Insumos</p>
      <div className="mb-2 space-y-2">
        {lineas.map(l => {
          const ing = ingMap.get(l.ingredientId)
          const grande = ing ? bulkUnit(ing.unit) : undefined
          const unidad = ing ? (l.bulk && grande ? grande : ing.unit) : ''
          const q = qtyBase(l, ing)
          const c = decimal(l.cost)
          return (
            <div key={l.key} className="rounded-2xl border border-cream-200 bg-cream-100/40 p-3">
              <div className="flex items-center gap-2">
                <select
                  value={l.ingredientId}
                  onChange={e => set(l.key, { ingredientId: e.target.value })}
                  className="min-w-0 flex-1 appearance-none rounded-xl border border-cream-300 bg-cream-50 px-3 py-2.5 text-base outline-none focus:border-berry-400"
                >
                  <option value="">Elige un insumo…</option>
                  {ingredients.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
                <button
                  type="button"
                  onClick={() => quitar(l.key)}
                  aria-label="Quitar insumo"
                  className="shrink-0 rounded-full px-2.5 py-1.5 text-sm text-berry-700/60 active:bg-cream-200"
                >
                  Quitar
                </button>
              </div>
              {ing && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-1.5">
                    <NumberInput value={l.qty} onChange={e => set(l.key, { qty: e.target.value })} placeholder="Cantidad" />
                    {grande ? (
                      <button
                        type="button"
                        onClick={() => set(l.key, { bulk: !l.bulk })}
                        className="shrink-0 rounded-full border border-cream-300 px-2.5 py-2 text-xs font-semibold text-berry-700"
                        title="Cambiar unidad"
                      >
                        {unidad}
                      </button>
                    ) : (
                      <span className="shrink-0 px-1 text-xs text-berry-700/60">{unidad}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-berry-700/60">$</span>
                    <NumberInput value={l.cost} onChange={e => set(l.key, { cost: e.target.value })} placeholder="Pagado" />
                  </div>
                </div>
              )}
              {ing && repetidos.has(l.ingredientId) && (
                <p className="mt-1.5 text-xs text-red-600">Este insumo ya está en la compra; suma las cantidades en un solo renglón.</p>
              )}
              {ing && q > 0 && c > 0 && (
                <p className="mt-1.5 text-xs text-berry-700/60">
                  {fmtUnitCost(c / q, ing.unit)}
                  {ing.cost > 0 && Math.abs(c / q - ing.cost) / ing.cost >= 0.05 && (
                    <> · antes {fmtUnitCost(ing.cost, ing.unit)}</>
                  )}
                </p>
              )}
            </div>
          )
        })}
      </div>
      <Button variant="soft" className="mb-4 w-full py-2.5 text-sm" onClick={() => setLineas(ls => [...ls, nueva()])}>
        + Agregar insumo
      </Button>

      <ExpensePaymentPicker value={payment} onChange={setPayment} allowOutside />
      {!session && payment !== 'fuera' && (
        <p className="-mt-1 mb-3 rounded-xl bg-cream-200/60 px-3 py-2 text-xs text-berry-700/70">
          La caja está cerrada: la compra queda como gasto del día, sin tocar el corte.
        </p>
      )}

      <div className="mb-3 flex items-baseline justify-between border-t border-cream-200 pt-3">
        <span className="text-sm text-berry-700/70">
          Total{completas.length > 0 && <> · {completas.length} {completas.length === 1 ? 'insumo' : 'insumos'}</>}
        </span>
        <span className="font-display text-2xl font-bold tabular-nums">{money(total)}</span>
      </div>
      <Button className="w-full" disabled={!valid || guardando} onClick={guardar}>
        Guardar compra
      </Button>
    </Sheet>
  )
}
