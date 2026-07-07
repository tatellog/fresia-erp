import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import type { Ingredient, Product } from '../../data/types'
import { EXTRA_TOPPING_PRICE, INCLUDED_TOPPINGS } from '../../services/sales'
import { productLine } from '../../services/catalog'
import { money, round2 } from '../../lib/format'
import { Button, Sheet } from '../../components/ui'

/**
 * Armado del vaso: toppings de la línea (2 incluidos, adicionales con
 * cargo) y extras disponibles solo para esa línea.
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
  const extrasDisponibles = useLiveQuery(
    () => db.products.filter(p => p.active && !!line && (p.extraScope ?? []).includes(line)).toArray(),
    [line],
  )
  const [selected, setSelected] = useState<Map<string, Ingredient>>(new Map())
  const [extras, setExtras] = useState<Map<string, Product>>(new Map())

  if (!toppings || !extrasDisponibles) return null

  const toggle = (t: Ingredient) => {
    const next = new Map(selected)
    if (next.has(t.id)) next.delete(t.id)
    else next.set(t.id, t)
    setSelected(next)
  }
  const toggleExtra = (e: Product) => {
    const next = new Map(extras)
    if (next.has(e.id)) next.delete(e.id)
    else next.set(e.id, e)
    setExtras(next)
  }

  const extraToppings = Math.max(0, selected.size - INCLUDED_TOPPINGS)
  const extrasTotal = [...extras.values()].reduce((s, e) => s + e.price, 0)
  const price = round2(product.price + extraToppings * EXTRA_TOPPING_PRICE + extrasTotal)

  return (
    <Sheet open onClose={onClose} title={product.name}>
      <p className="mb-3 text-sm text-berry-700/70">
        Elige tus toppings · <b>{INCLUDED_TOPPINGS} incluidos</b>, adicionales {money(EXTRA_TOPPING_PRICE)} c/u
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        {toppings.sort((a, b) => a.name.localeCompare(b.name)).map(t => {
          const on = selected.has(t.id)
          return (
            <button
              key={t.id}
              onClick={() => toggle(t)}
              className={`rounded-full px-3.5 py-2 text-sm font-semibold transition-colors ${
                on ? 'bg-berry-500 text-white' : 'bg-cream-200 text-berry-700'
              }`}
            >
              {t.name}
            </button>
          )
        })}
        {toppings.length === 0 && (
          <p className="text-sm text-berry-700/60">No hay toppings de esta línea en Insumos.</p>
        )}
      </div>

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
        {selected.size} {selected.size === 1 ? 'topping' : 'toppings'}
        {extraToppings > 0 && <> · {extraToppings} adicional{extraToppings > 1 && 'es'} (+{money(extraToppings * EXTRA_TOPPING_PRICE)})</>}
        {extras.size > 0 && <> · {extras.size} extra{extras.size > 1 && 's'} (+{money(extrasTotal)})</>}
      </div>

      <Button className="w-full text-lg" onClick={() => onConfirm([...selected.values()], [...extras.values()])}>
        Agregar · {money(price)}
      </Button>
    </Sheet>
  )
}
