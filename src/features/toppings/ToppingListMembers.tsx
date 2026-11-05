import { useState } from 'react'
import type { Ingredient, ToppingGroup, ToppingList } from '../../data/types'
import { copyToppings, setIngredientInList, toppingCountByList, toppingListName } from '../../services/toppingLists'
import { strip } from '../../services/photos'
import { fmtQty } from '../../services/units'
import { Input } from '../../components/ui'

/** chip de topping: nombre y porción; marcado = está en la lista */
function Chip({ ing, on, onTap }: { ing: Ingredient; on: boolean; onTap: () => void }) {
  return (
    <button
      type="button"
      onClick={onTap}
      className={`rounded-full px-3.5 py-2 text-sm font-semibold ${
        on ? 'bg-berry-500 text-white' : 'border border-cream-300 bg-cream-50 text-berry-700'
      }`}
    >
      {on && <span className="mr-1">✓</span>}
      {ing.name}
      {on && ing.portion ? (
        <span className="ml-1.5 font-normal text-white/75">{fmtQty(ing.portion, ing.unit)}</span>
      ) : null}
    </button>
  )
}

/**
 * Qué toppings trae una lista, editable desde el producto: sin esto había que
 * entrar a Inventario insumo por insumo y el vaso se vendía sin toppings que elegir.
 */
export function ToppingListMembers({ group, lists, ingredients }: {
  group: ToppingGroup
  lists: ToppingList[]
  ingredients: Ingredient[]
}) {
  const [query, setQuery] = useState('')
  const dentro = ingredients.filter(i => (i.toppingGroups ?? []).includes(group))
  const q = strip(query.trim())
  // sin buscar se ofrecen los toppings de otras listas; buscando, cualquier insumo
  const fuera = ingredients.filter(i =>
    !(i.toppingGroups ?? []).includes(group) &&
    (q ? strip(i.name).includes(q) : (i.toppingGroups ?? []).length > 0))
  const counts = toppingCountByList(ingredients)
  const otras = lists.filter(l => l.id !== group && (counts.get(l.id) ?? 0) > 0)

  return (
    <div className="mt-4">
      <div className="mb-1.5 flex items-baseline justify-between gap-3">
        <span className="text-sm font-medium text-berry-700">¿Qué toppings trae {toppingListName(lists, group)}?</span>
        <span className="text-xs tabular-nums text-berry-700/55">{dentro.length} marcados</span>
      </div>

      {dentro.length === 0 && (
        <p className="mb-2 text-xs text-amber-700">
          Sin toppings marcados, al vender no habrá nada que elegir. Marca aquí los que lleva.
        </p>
      )}

      {dentro.length === 0 && otras.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {otras.map(l => (
            <button
              key={l.id}
              type="button"
              onClick={() => void copyToppings(l.id, group)}
              className="rounded-full border border-dashed border-berry-300 px-3 py-1.5 text-[13px] text-berry-700 active:bg-cream-200"
            >
              Copiar los {counts.get(l.id)} de {l.name}
            </button>
          ))}
        </div>
      )}

      {dentro.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {dentro.map(i => (
            <Chip key={i.id} ing={i} on onTap={() => void setIngredientInList(i, group, false)} />
          ))}
        </div>
      )}

      <Input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Buscar insumo para agregar…"
        className="mb-2 py-2"
      />
      <div className="flex max-h-44 flex-wrap gap-1.5 overflow-y-auto">
        {fuera.map(i => (
          <Chip key={i.id} ing={i} on={false} onTap={() => void setIngredientInList(i, group, true)} />
        ))}
        {fuera.length === 0 && (
          <p className="py-1 text-xs text-berry-700/60">
            {q ? 'Ningún insumo con ese nombre.' : 'Busca el insumo por su nombre para agregarlo.'}
          </p>
        )}
      </div>
      <p className="mt-1.5 text-xs text-berry-700/60">
        Un insumo nuevo como topping estrena una porción por vaso; ajústala en Inventario, igual que su precio premium.
      </p>
    </div>
  )
}
