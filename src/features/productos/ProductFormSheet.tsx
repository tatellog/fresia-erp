import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import type { Ingredient, Product, RecipeItem, ToppingGroup } from '../../data/types'
import { deleteProduct, saveProduct } from '../../services/catalog'
import { EXTRA_TOPPING_PRICE, INCLUDED_TOPPINGS } from '../../services/sales'
import { money } from '../../lib/format'
import { strip } from '../../services/photos'
import { Button, Field, Input, Sheet } from '../../components/ui'


/** renglón de insumo: nombre, cantidad y unidad; resaltado si ya está en la receta */
function RecipeRow({ ing, qty, onChange }: { ing: Ingredient; qty: number; onChange: (qty: number) => void }) {
  const on = qty > 0
  return (
    <label className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${
      on ? 'border-berry-200 bg-berry-50' : 'border-cream-200 bg-cream-50'
    }`}>
      <span className={`min-w-0 flex-1 truncate text-sm ${on ? 'font-semibold text-berry-700' : 'font-medium'}`}>{ing.name}</span>
      <Input
        type="number"
        inputMode="decimal"
        min={0}
        value={qty || ''}
        placeholder="0"
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="!w-24 shrink-0 py-1.5 text-right tabular-nums"
      />
      <span className="w-7 shrink-0 text-xs text-berry-700/60">{ing.unit}</span>
    </label>
  )
}

/** alta y edición de productos con su receta */
export function ProductFormSheet({ product, nextSort, onClose }: { product?: Product; nextSort: number; onClose: () => void }) {
  const ingredients = useLiveQuery(() => db.ingredients.orderBy('name').toArray())
  const [name, setName] = useState(product?.name ?? '')
  const [price, setPrice] = useState(product ? String(product.price) : '')
  const [active, setActive] = useState(product?.active ?? true)
  const [recipe, setRecipe] = useState<RecipeItem[]>(product?.recipe ?? [])
  const [toppingGroup, setToppingGroup] = useState<ToppingGroup | undefined>(product?.toppingGroup)
  const [included, setIncluded] = useState(product?.includedToppings ?? INCLUDED_TOPPINGS)
  const [query, setQuery] = useState('')

  if (!ingredients) return null
  const ingMap = new Map(ingredients.map(i => [i.id, i]))
  const qtyOf = (id: string) => recipe.find(r => r.ingredientId === id)?.qty ?? 0
  const cost = recipe.reduce((s, r) => s + (ingMap.get(r.ingredientId)?.cost ?? 0) * r.qty, 0)
  const p = parseFloat(price)
  const valid = name.trim() && p > 0

  const setQty = (ingredientId: string, qty: number) => {
    setRecipe(prev => {
      const rest = prev.filter(r => r.ingredientId !== ingredientId)
      return qty > 0 ? [...rest, { ingredientId, qty }] : rest
    })
  }

  // en la receta primero; el resto se filtra con el buscador
  const enReceta = ingredients.filter(i => qtyOf(i.id) > 0)
  const q = strip(query.trim())
  const disponibles = ingredients.filter(i => qtyOf(i.id) === 0 && (!q || strip(i.name).includes(q)))

  const save = async () => {
    await saveProduct({
      name: name.trim(),
      emoji: product?.emoji ?? '🍓',
      price: p,
      recipe,
      active,
      toppingGroup,
      includedToppings: toppingGroup && included !== INCLUDED_TOPPINGS ? included : undefined,
    }, product, nextSort)
    onClose()
  }

  return (
    <Sheet open onClose={onClose} title={product ? `Editar · ${product.name}` : 'Nuevo producto'}>
      <div className="grid gap-x-4 md:grid-cols-[1fr_10rem]">
        <Field label="Nombre">
          <Input value={name} onChange={e => setName(e.target.value)} placeholder="Clásica · Mediano 16 oz" autoFocus={!product} />
        </Field>
        <Field label="Precio de venta ($)">
          <Input type="number" inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)} className="tabular-nums" />
        </Field>
      </div>

      <Field label="Toppings elegibles">
        <div className="grid grid-cols-3 gap-2">
          {([undefined, 'clasica', 'balance'] as (ToppingGroup | undefined)[]).map(g => (
            <button
              key={g ?? 'no'}
              type="button"
              onClick={() => setToppingGroup(g)}
              className={`rounded-xl py-2.5 text-sm font-semibold ${
                toppingGroup === g ? 'bg-berry-500 text-white' : 'bg-cream-200 text-berry-700'
              }`}
            >
              {g === undefined ? 'No lleva' : g === 'clasica' ? 'Sí, lista Clásica' : 'Sí, lista Balance'}
            </button>
          ))}
        </div>
      </Field>
      {toppingGroup && (
        <div className="mb-4 flex items-center justify-between rounded-xl bg-cream-200 px-4 py-2.5">
          <div>
            <div className="text-sm font-medium text-berry-700">Toppings incluidos en el precio</div>
            <div className="text-xs text-berry-700/60">Los adicionales se cobran a {money(EXTRA_TOPPING_PRICE)}; los premium siempre con cargo.</div>
          </div>
          <div className="flex items-center gap-1">
            {[0, 1, 2, 3].map(n => (
              <button
                key={n}
                type="button"
                onClick={() => setIncluded(n)}
                className={`h-9 w-9 rounded-full text-sm font-bold ${
                  included === n ? 'bg-berry-500 text-white' : 'bg-cream-50 text-berry-700'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-sm font-medium text-berry-700">Receta</span>
        <span className="text-xs text-berry-700/60">
          {enReceta.length} {enReceta.length === 1 ? 'insumo' : 'insumos'} · costo {money(cost)}
        </span>
      </div>
      <p className="mb-2 text-xs text-berry-700/60">Insumos por unidad vendida. Con esto se calcula el costo real y se descuenta el inventario en cada venta.</p>

      {enReceta.length > 0 && (
        <div className="mb-3 grid gap-1.5 md:grid-cols-2">
          {enReceta.map(ing => (
            <RecipeRow key={ing.id} ing={ing} qty={qtyOf(ing.id)} onChange={qty => setQty(ing.id, qty)} />
          ))}
        </div>
      )}

      {ingredients.length === 0 ? (
        <p className="mb-3 text-sm text-berry-700/60">Primero registra insumos en la pestaña Insumos.</p>
      ) : (
        <details className="mb-3 rounded-2xl border border-cream-200" open={enReceta.length === 0}>
          <summary className="cursor-pointer select-none px-4 py-2.5 text-sm font-medium text-berry-700">
            Agregar insumo <span className="font-normal text-berry-700/60">· {disponibles.length} disponibles</span>
          </summary>
          <div className="px-3 pb-3">
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar insumo…"
              className="mb-2 py-2"
            />
            <div className="grid max-h-64 gap-1.5 overflow-y-auto md:grid-cols-2">
              {disponibles.map(ing => (
                <RecipeRow key={ing.id} ing={ing} qty={0} onChange={qty => setQty(ing.id, qty)} />
              ))}
              {disponibles.length === 0 && (
                <p className="col-span-full py-2 text-center text-sm text-berry-700/60">Sin resultados.</p>
              )}
            </div>
          </div>
        </details>
      )}

      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 rounded-xl bg-cream-200 px-4 py-3 text-sm">
        <span>Costo por unidad: <b>{money(cost)}</b></span>
        {valid && (
          <span>
            Ganancia: <b className="text-green-700">{money(p - cost)}</b> ({p > 0 ? (((p - cost) / p) * 100).toFixed(0) : 0}%)
          </span>
        )}
      </div>

      <label className="mb-4 flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="h-5 w-5 accent-berry-500" />
        Visible en el punto de venta
      </label>

      <div className="flex flex-col gap-2 md:flex-row-reverse">
        <Button className="w-full md:flex-1" disabled={!valid} onClick={save}>Guardar</Button>
        {product && (
          <Button
            variant="danger"
            className="w-full md:w-auto md:px-6"
            onClick={async () => {
              if (confirm(`¿Eliminar ${product.name}? Las ventas pasadas no se pierden.`)) {
                await deleteProduct(product.id)
                onClose()
              }
            }}
          >
            Eliminar
          </Button>
        )}
      </div>
    </Sheet>
  )
}
