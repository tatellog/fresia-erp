import { useState, type ReactNode } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import type { Ingredient, Product, RecipeItem, ToppingGroup } from '../../data/types'
import { deleteProduct, saveProduct } from '../../services/catalog'
import { EXTRA_TOPPING_PRICE, INCLUDED_TOPPINGS } from '../../services/sales'
import { money } from '../../lib/format'
import { toSquareJpeg } from '../../lib/image'
import { productPhoto, strip, toppingPhoto } from '../../services/photos'
import { toppingCountByList, toppingListName } from '../../services/toppingLists'
import { Button, Field, Input, Sheet } from '../../components/ui'
import { CupIcon } from '../../components/ui/icons'
import { ToppingListChips } from '../toppings/ToppingListChips'


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

/** apartado plegable: lo esencial va arriba, lo opcional se abre solo si hace falta */
function Section({ title, summary, defaultOpen, children }: {
  title: string
  summary?: string
  defaultOpen?: boolean
  children: ReactNode
}) {
  return (
    <details className="mb-3 rounded-2xl border border-cream-200 bg-cream-50" open={defaultOpen}>
      <summary className="flex cursor-pointer select-none items-baseline justify-between gap-3 px-4 py-3">
        <span className="text-sm font-semibold text-berry-700">{title}</span>
        {summary && <span className="truncate text-xs text-berry-700/60">{summary}</span>}
      </summary>
      <div className="px-4 pb-4">{children}</div>
    </details>
  )
}

/** foto del producto: la subida o la del menú; toca para cambiarla */
function PhotoPicker({ photo, custom, onPick, onClear }: {
  photo?: string
  custom: boolean
  onPick: (file: File) => void
  onClear: () => void
}) {
  return (
    <div className="flex shrink-0 flex-col items-center gap-1.5">
      <label className="relative block h-28 w-28 cursor-pointer overflow-hidden rounded-2xl border border-cream-300 bg-cream-100">
        {photo ? (
          <img src={photo} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-berry-300">
            <CupIcon className="h-8 w-8" strokeWidth={1.3} />
            <span className="text-[11px] font-medium text-berry-700/60">Agregar foto</span>
          </div>
        )}
        {photo && (
          <span className="absolute inset-x-0 bottom-0 bg-black/45 py-1 text-center text-[11px] font-medium text-white">
            Cambiar
          </span>
        )}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={e => {
            const f = e.target.files?.[0]
            if (f) onPick(f)
            e.target.value = ''
          }}
        />
      </label>
      {custom && (
        <button type="button" onClick={onClear} className="text-xs font-medium text-berry-700/60 underline-offset-2 hover:underline">
          Quitar foto
        </button>
      )}
    </div>
  )
}

/** alta y edición de productos: nombre, precio y foto arriba; toppings y receta plegados */
export function ProductFormSheet({ product, nextSort, onClose }: { product?: Product; nextSort: number; onClose: () => void }) {
  const ingredients = useLiveQuery(() => db.ingredients.orderBy('name').toArray())
  const lists = useLiveQuery(() => db.toppingLists.orderBy('sort').toArray())
  const [name, setName] = useState(product?.name ?? '')
  const [price, setPrice] = useState(product ? String(product.price) : '')
  const [photo, setPhoto] = useState<string | undefined>(product?.photo)
  const [active, setActive] = useState(product?.active ?? true)
  const [recipe, setRecipe] = useState<RecipeItem[]>(product?.recipe ?? [])
  const [toppingGroup, setToppingGroup] = useState<ToppingGroup | undefined>(product?.toppingGroup)
  const [included, setIncluded] = useState(product?.includedToppings ?? INCLUDED_TOPPINGS)
  const [query, setQuery] = useState('')
  const [photoError, setPhotoError] = useState('')

  if (!ingredients || !lists) return null
  const ingMap = new Map(ingredients.map(i => [i.id, i]))
  const qtyOf = (id: string) => recipe.find(r => r.ingredientId === id)?.qty ?? 0
  const cost = recipe.reduce((s, r) => s + (ingMap.get(r.ingredientId)?.cost ?? 0) * r.qty, 0)
  const p = parseFloat(price)
  const valid = name.trim() && p > 0

  // la foto que se vería en el menú con lo capturado hasta ahora
  const draft: Product = { id: '', emoji: '🍓', recipe: [], active: true, sort: 0, ...product, name, price: p || 0, photo }
  const preview = productPhoto(draft) ?? toppingPhoto(name)

  const pickPhoto = async (file: File) => {
    try {
      setPhoto(await toSquareJpeg(file))
      setPhotoError('')
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : 'No se pudo leer la imagen')
    }
  }

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
      photo,
      recipe,
      active,
      toppingGroup,
      includedToppings: toppingGroup && included !== INCLUDED_TOPPINGS ? included : undefined,
    }, product, nextSort)
    onClose()
  }

  const countByList = toppingCountByList(ingredients)
  const toppingsSummary = toppingGroup
    ? `escoge de la lista ${toppingListName(lists, toppingGroup)} · ${included} sin costo`
    : 'no lleva'
  const recipeSummary = enReceta.length === 0
    ? 'sin insumos'
    : `${enReceta.length} ${enReceta.length === 1 ? 'insumo' : 'insumos'} · costo ${money(cost)}`

  return (
    <Sheet open onClose={onClose} title={product ? `Editar · ${product.name}` : 'Nuevo producto'}>
      <div className="mb-3 flex gap-4">
        <PhotoPicker photo={preview} custom={!!photo} onPick={pickPhoto} onClear={() => setPhoto(undefined)} />
        <div className="min-w-0 flex-1">
          <Field label="Nombre">
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Clásica · Mediano 16 oz" autoFocus={!product} />
          </Field>
          <Field label="Precio de venta ($)">
            <Input type="number" inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)} className="tabular-nums" />
          </Field>
        </div>
      </div>
      {photoError && <p className="-mt-1 mb-3 text-xs text-berry-500">{photoError}</p>}

      <label className="mb-4 flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="h-5 w-5 accent-berry-500" />
        Visible en el punto de venta
      </label>

      <Section title="Toppings que elige el cliente" summary={toppingsSummary} defaultOpen={!!toppingGroup}>
        <p className="mb-3 text-xs text-berry-700/60">
          Si el producto lleva toppings, al venderlo el cliente los escoge de una lista. Una lista es el conjunto de toppings que se le ofrecen; a cada topping se le asignan sus listas desde Insumos.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {([false, true] as const).map(yes => (
            <button
              key={String(yes)}
              type="button"
              onClick={() => setToppingGroup(yes ? (toppingGroup ?? lists[0]?.id) : undefined)}
              className={`rounded-xl py-2.5 text-sm font-semibold ${
                !!toppingGroup === yes ? 'bg-berry-500 text-white' : 'bg-cream-200 text-berry-700'
              }`}
            >
              {yes ? 'Sí, el cliente elige' : 'No lleva toppings'}
            </button>
          ))}
        </div>

        {toppingGroup && (
          <>
            <div className="mt-4 mb-1.5 text-sm font-medium text-berry-700">¿De qué lista escoge?</div>
            <ToppingListChips
              lists={lists}
              selected={[toppingGroup]}
              counts={countByList}
              onToggle={setToppingGroup}
              onCreated={setToppingGroup}
            />
            {(countByList.get(toppingGroup) ?? 0) === 0 && (
              <p className="mt-2 text-xs text-amber-700">
                Esta lista aún no tiene toppings. Entra a Insumos, abre cada topping y márcale esta lista.
              </p>
            )}

            <div className="mt-4 rounded-xl bg-cream-200 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium text-berry-700">¿Cuántos toppings van sin costo?</div>
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
              <p className="mt-1.5 text-xs text-berry-700/60">
                {included === 0 ? 'Todos los toppings se cobran' : `Los primeros ${included} van incluidos en el precio`}; cada topping extra se cobra a {money(EXTRA_TOPPING_PRICE)}. Los premium, como pistache y Lotus, siempre se cobran aparte.
              </p>
            </div>
          </>
        )}
      </Section>

      <Section title="Receta e insumos" summary={recipeSummary} defaultOpen={enReceta.length > 0}>
        <p className="mb-3 text-xs text-berry-700/60">
          Insumos que se gastan por cada unidad vendida. Con esto se calcula el costo real y se descuenta el inventario en cada venta. Es opcional: sin receta el producto se vende igual, solo no verás su ganancia.
        </p>

        {enReceta.length > 0 && (
          <div className="mb-3 grid gap-1.5 md:grid-cols-2">
            {enReceta.map(ing => (
              <RecipeRow key={ing.id} ing={ing} qty={qtyOf(ing.id)} onChange={qty => setQty(ing.id, qty)} />
            ))}
          </div>
        )}

        {ingredients.length === 0 ? (
          <p className="text-sm text-berry-700/60">Primero registra insumos en la pestaña Insumos.</p>
        ) : (
          <>
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder={`Buscar insumo… · ${disponibles.length} disponibles`}
              className="mb-2 py-2"
            />
            <div className="grid max-h-56 gap-1.5 overflow-y-auto md:grid-cols-2">
              {disponibles.map(ing => (
                <RecipeRow key={ing.id} ing={ing} qty={0} onChange={qty => setQty(ing.id, qty)} />
              ))}
              {disponibles.length === 0 && (
                <p className="col-span-full py-2 text-center text-sm text-berry-700/60">Sin resultados.</p>
              )}
            </div>
          </>
        )}

        {cost > 0 && (
          <div className="mt-3 flex flex-wrap items-baseline justify-between gap-2 rounded-xl bg-cream-200 px-4 py-3 text-sm">
            <span>Costo por unidad: <b>{money(cost)}</b></span>
            {valid && (
              <span>
                Ganancia: <b className="text-green-700">{money(p - cost)}</b> ({(((p - cost) / p) * 100).toFixed(0)}%)
              </span>
            )}
          </div>
        )}
      </Section>

      <div className="mt-4 flex flex-col gap-2 md:flex-row-reverse">
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
