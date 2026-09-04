import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import type { Ingredient, Product } from '../../data/types'
import { EXTRA_TOPPING_PRICE, includedToppings, toppingPremium, toppingsCharge } from '../../services/sales'
import { productLine } from '../../services/catalog'
import { toppingPhoto } from '../../services/photos'
import { money, round2 } from '../../lib/format'
import { Button, Sheet } from '../../components/ui'

/**
 * Tarjeta de topping con foto a toda la card y su precio. Con `qty` la
 * tarjeta funciona como contador: cada toque suma una porción (doble
 * cajeta = ×2) y el botón − resta una.
 */
function ToppingCard({ t, premium, on, label, labelIncluded, disabled, onTap, qty, onMinus }: {
  t: Ingredient
  /** cargo premium en este producto (0 = va dentro de los incluidos) */
  premium: number
  on: boolean
  label: string
  labelIncluded?: boolean
  disabled?: boolean
  onTap: () => void
  /** porciones elegidas (modo contador); sin definir = selección simple con ✓ */
  qty?: number
  onMinus?: () => void
}) {
  const photo = toppingPhoto(t.name)
  return (
    <button
      onClick={onTap}
      disabled={disabled}
      className={`relative aspect-square overflow-hidden rounded-2xl text-left transition-all active:scale-[0.96] ${
        on
          ? 'shadow-lg ring-2 ring-berry-500'
          : photo
            ? 'border border-black/10 shadow-[0_2px_8px_rgba(0,0,0,0.12)]'
            : 'border border-cream-300 bg-cream-200'
      } ${disabled ? 'opacity-35' : ''}`}
    >
      {photo && <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" />}
      {/* degradado para que el nombre y el precio lean sobre la foto */}
      {photo && <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/15 to-transparent" />}
      {on && <span aria-hidden className={`absolute inset-0 ${photo ? 'bg-berry-500/35' : 'bg-berry-500/15'}`} />}
      {on && (
        <span className="absolute right-1.5 top-1.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-berry-500 px-1.5 text-sm font-bold text-white shadow">
          {qty !== undefined ? `×${qty}` : '✓'}
        </span>
      )}
      {on && onMinus && (
        <span
          role="button"
          onClick={e => { e.stopPropagation(); onMinus() }}
          className="absolute left-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-lg font-bold text-white shadow backdrop-blur-sm active:bg-black/70"
        >
          −
        </span>
      )}
      {!!premium && !on && (
        <span className={`absolute left-1.5 top-1.5 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.14em] ${
          photo ? 'bg-black/40 text-amber-300 backdrop-blur-sm' : 'bg-berry-50 text-berry-500'
        }`}>
          Premium
        </span>
      )}
      <span className={`absolute inset-x-0 bottom-0 p-2.5 ${photo ? 'text-white' : 'text-berry-700'}`}>
        <span className={`block text-[13px] font-semibold leading-tight ${photo ? 'drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]' : ''}`}>
          {t.name}
        </span>
        <span className={`block text-[11px] font-bold ${
          photo
            ? labelIncluded ? 'text-emerald-300' : 'text-white/85'
            : labelIncluded ? 'text-emerald-700' : 'text-berry-500'
        }`}>
          {label}
        </span>
      </span>
    </button>
  )
}

/**
 * Armado del vaso en dos pasos: los 2 toppings incluidos (premium siempre
 * con cargo), luego toppings extra con cargo y extras de la línea.
 */
export function ToppingPickerSheet({ product, onConfirm, onClose }: {
  product: Product
  onConfirm: (toppings: Ingredient[], extras: Product[]) => void
  onClose: () => void
}) {
  const toppings = useLiveQuery(
    () => db.ingredients.filter(i => (i.toppingGroups ?? []).includes(product.toppingGroup!)).toArray(),
    [product.toppingGroup],
  )
  const line = productLine(product)
  const included = includedToppings(product)
  const extrasDisponibles = useLiveQuery(
    () => db.products.filter(p => p.active && !!line && (p.extraScope ?? []).includes(line)).toArray(),
    [line],
  )
  /** toppings incluidos por porciones: doble cajeta = qty 2 dentro de los 2 incluidos */
  const [incluidos, setIncluidos] = useState<Map<string, { t: Ingredient; qty: number }>>(new Map())
  /** toppings extra por porciones: doble cajeta = qty 2 */
  const [extraTops, setExtraTops] = useState<Map<string, { t: Ingredient; qty: number }>>(new Map())
  const [extras, setExtras] = useState<Map<string, Product>>(new Map())

  if (!toppings || !extrasDisponibles) return null

  const incluidosCount = [...incluidos.values()].reduce((s, x) => s + x.qty, 0)

  /** cada toque suma una porción mientras queden espacios incluidos */
  const masIncluido = (t: Ingredient) => {
    if (incluidosCount >= included) return
    const next = new Map(incluidos)
    next.set(t.id, { t, qty: (next.get(t.id)?.qty ?? 0) + 1 })
    setIncluidos(next)
  }

  const menosIncluido = (t: Ingredient) => {
    const next = new Map(incluidos)
    const qty = (next.get(t.id)?.qty ?? 0) - 1
    if (qty <= 0) next.delete(t.id)
    else next.set(t.id, { t, qty })
    setIncluidos(next)
  }

  /** cada toque suma una porción del topping extra */
  const masExtra = (t: Ingredient) => {
    const next = new Map(extraTops)
    next.set(t.id, { t, qty: (next.get(t.id)?.qty ?? 0) + 1 })
    setExtraTops(next)
  }

  const menosExtra = (t: Ingredient) => {
    const next = new Map(extraTops)
    const qty = (next.get(t.id)?.qty ?? 0) - 1
    if (qty <= 0) next.delete(t.id)
    else next.set(t.id, { t, qty })
    setExtraTops(next)
  }
  const toggleExtra = (e: Product) => {
    const next = new Map(extras)
    if (next.has(e.id)) next.delete(e.id)
    else next.set(e.id, e)
    setExtras(next)
  }

  // el precio se calcula sobre el conjunto: premium siempre con cargo,
  // normales después de los 2 incluidos a EXTRA_TOPPING_PRICE.
  // Cada porción extra es una entrada más (doble cajeta = 2 entradas).
  const chosen = [
    ...[...incluidos.values()].flatMap(({ t, qty }) => Array.from({ length: qty }, () => t)),
    ...[...extraTops.values()].flatMap(({ t, qty }) => Array.from({ length: qty }, () => t)),
  ]
  const premium = (t: Ingredient) => toppingPremium(t, product)
  const toppingsTotal = toppingsCharge(chosen, product)
  const extraToppings = Math.max(0, chosen.filter(t => !premium(t)).length - included)
  const premiumCount = chosen.filter(t => premium(t)).length
  const premiumTotal = chosen.reduce((s, t) => s + premium(t), 0)
  const extrasTotal = [...extras.values()].reduce((s, e) => s + e.price, 0)
  const price = round2(product.price + toppingsTotal + extrasTotal)
  const ordered = [...toppings].sort((a, b) => a.name.localeCompare(b.name))
  const llenos = incluidosCount >= included

  return (
    <Sheet open onClose={onClose} title={product.name}>
      <div className="mb-2 flex items-baseline justify-between">
        <p className="text-sm font-medium text-berry-700">
          {included === 1 ? 'Tu topping incluido' : `Tus ${included} toppings incluidos`} <span className="font-normal text-berry-700/60">· toca de nuevo para doble</span>
        </p>
        <span className={`text-xs font-bold tabular-nums ${llenos ? 'text-emerald-700' : 'text-berry-700/50'}`}>
          {incluidosCount}/{included}
        </span>
      </div>
      <div className="mb-5 grid grid-cols-3 gap-2.5 sm:grid-cols-4">
        {ordered.map(t => {
          const qty = incluidos.get(t.id)?.qty ?? 0
          return (
            <ToppingCard
              key={t.id}
              t={t}
              premium={premium(t)}
              on={qty > 0}
              qty={qty > 1 ? qty : undefined}
              label={premium(t) ? `+${money(premium(t))}` : 'Incluido'}
              labelIncluded={!premium(t)}
              disabled={llenos && qty === 0}
              onTap={() => masIncluido(t)}
              onMinus={() => menosIncluido(t)}
            />
          )
        })}
        {toppings.length === 0 && (
          <p className="col-span-full text-sm text-berry-700/60">No hay toppings de esta línea en Insumos.</p>
        )}
      </div>

      {toppings.length > 0 && (
        <>
          <p className="mb-2 text-sm font-medium text-berry-700">
            Topping extra <span className="font-normal text-berry-700/60">
              · {money(EXTRA_TOPPING_PRICE)} c/u
              {ordered.some(t => premium(t)) && <>, premium {money(Math.max(...ordered.map(premium)))}</>}
              · toca de nuevo para doble
            </span>
          </p>
          <div className="mb-5 grid grid-cols-3 gap-2.5 sm:grid-cols-4">
            {ordered.map(t => {
              const qty = extraTops.get(t.id)?.qty ?? 0
              return (
                <ToppingCard
                  key={t.id}
                  t={t}
                  premium={premium(t)}
                  on={qty > 0}
                  qty={qty > 0 ? qty : undefined}
                  label={`+${money(premium(t) || EXTRA_TOPPING_PRICE)}`}
                  onTap={() => masExtra(t)}
                  onMinus={() => menosExtra(t)}
                />
              )
            })}
          </div>
        </>
      )}

      {extrasDisponibles.length > 0 && (
        <>
          <p className="mb-2 text-sm font-medium text-berry-700">Extras</p>
          <div className="mb-4 flex flex-wrap gap-2">
            {extrasDisponibles.map(e => {
              const on = extras.has(e.id)
              return (
                <button
                  key={e.id}
                  onClick={() => toggleExtra(e)}
                  className={`rounded-full border px-3.5 py-2 text-sm font-semibold transition-colors ${
                    on ? 'border-berry-500 bg-berry-500 text-white' : 'border-cream-300 bg-cream-50 text-berry-700'
                  }`}
                >
                  {e.name} <span className={on ? 'text-white/80' : 'text-berry-500'}>+{money(e.price)}</span>
                </button>
              )
            })}
          </div>
        </>
      )}

      <div className="mb-3 rounded-xl bg-cream-200 px-4 py-3 text-sm">
        {chosen.length} {chosen.length === 1 ? 'topping' : 'toppings'}
        {extraToppings > 0 && <> · {extraToppings} extra{extraToppings > 1 && 's'} (+{money(extraToppings * EXTRA_TOPPING_PRICE)})</>}
        {premiumCount > 0 && <> · {premiumCount} premium (+{money(premiumTotal)})</>}
        {extras.size > 0 && <> · {extras.size} extra{extras.size > 1 && 's'} de la línea (+{money(extrasTotal)})</>}
      </div>

      <Button className="w-full text-lg" onClick={() => onConfirm(chosen, [...extras.values()])}>
        Agregar · {money(price)}
      </Button>
    </Sheet>
  )
}
