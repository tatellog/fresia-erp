import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import type { Ingredient, Product } from '../../data/types'
import { EXTRA_TOPPING_PRICE, INCLUDED_TOPPINGS } from '../../services/sales'
import { money, round2 } from '../../lib/format'
import { Button, Sheet } from '../../components/ui'

/** elección de toppings al agregar un vaso: 2 incluidos, adicionales con cargo */
export function ToppingPickerSheet({ product, onConfirm, onClose }: {
  product: Product
  onConfirm: (toppings: Ingredient[]) => void
  onClose: () => void
}) {
  const toppings = useLiveQuery(
    () => db.ingredients.filter(i => (i.toppingGroups ?? []).includes(product.toppingGroup!)).toArray(),
    [product.toppingGroup],
  )
  const [selected, setSelected] = useState<Map<string, Ingredient>>(new Map())

  if (!toppings) return null

  const toggle = (t: Ingredient) => {
    const next = new Map(selected)
    if (next.has(t.id)) next.delete(t.id)
    else next.set(t.id, t)
    setSelected(next)
  }

  const extras = Math.max(0, selected.size - INCLUDED_TOPPINGS)
  const price = round2(product.price + extras * EXTRA_TOPPING_PRICE)

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

      <div className="mb-3 rounded-xl bg-cream-200 px-4 py-3 text-sm">
        {selected.size} {selected.size === 1 ? 'topping' : 'toppings'}
        {extras > 0 && <> · {extras} adicional{extras > 1 && 'es'} (+{money(extras * EXTRA_TOPPING_PRICE)})</>}
      </div>

      <Button className="w-full text-lg" onClick={() => onConfirm([...selected.values()])}>
        Agregar · {money(price)}
      </Button>
    </Sheet>
  )
}
