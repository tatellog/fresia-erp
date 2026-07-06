import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import type { Product, RecipeItem, ToppingGroup } from '../../data/types'
import { deleteProduct, saveProduct } from '../../services/catalog'
import { money } from '../../lib/format'
import { Button, Field, Input, Sheet } from '../../components/ui'

/** alta y edición de productos con su receta */
export function ProductFormSheet({ product, nextSort, onClose }: { product?: Product; nextSort: number; onClose: () => void }) {
  const ingredients = useLiveQuery(() => db.ingredients.orderBy('name').toArray())
  const [name, setName] = useState(product?.name ?? '')
  const [price, setPrice] = useState(product ? String(product.price) : '')
  const [active, setActive] = useState(product?.active ?? true)
  const [recipe, setRecipe] = useState<RecipeItem[]>(product?.recipe ?? [])
  const [toppingGroup, setToppingGroup] = useState<ToppingGroup | undefined>(product?.toppingGroup)

  if (!ingredients) return null
  const ingMap = new Map(ingredients.map(i => [i.id, i]))
  const cost = recipe.reduce((s, r) => s + (ingMap.get(r.ingredientId)?.cost ?? 0) * r.qty, 0)
  const p = parseFloat(price)
  const valid = name.trim() && p > 0

  const setQty = (ingredientId: string, qty: number) => {
    setRecipe(prev => {
      const rest = prev.filter(r => r.ingredientId !== ingredientId)
      return qty > 0 ? [...rest, { ingredientId, qty }] : rest
    })
  }

  const save = async () => {
    await saveProduct({ name: name.trim(), emoji: product?.emoji ?? '🍓', price: p, recipe, active, toppingGroup }, product, nextSort)
    onClose()
  }

  return (
    <Sheet open onClose={onClose} title={product ? `Editar · ${product.name}` : 'Nuevo producto'}>
      <Field label="Nombre">
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Clásica · Chica 350 ml" autoFocus={!product} />
      </Field>
      <Field label="Precio de venta ($)">
        <Input type="number" inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)} />
      </Field>

      <Field label="¿Lleva toppings elegibles? (2 incluidos, adicionales $15)">
        <div className="grid grid-cols-3 gap-2">
          {([undefined, 'clasica', 'balance'] as (ToppingGroup | undefined)[]).map(g => (
            <button
              key={g ?? 'no'}
              onClick={() => setToppingGroup(g)}
              className={`rounded-xl py-2.5 text-sm font-semibold ${
                toppingGroup === g ? 'bg-berry-500 text-white' : 'bg-cream-200 text-berry-700'
              }`}
            >
              {g === undefined ? 'No' : g === 'clasica' ? 'Clásica' : 'Balance'}
            </button>
          ))}
        </div>
      </Field>

      <div className="mb-1 text-sm font-medium text-berry-700">Receta (insumos por unidad vendida)</div>
      <p className="mb-2 text-xs text-berry-700/60">Con esto se calcula el costo real y se descuenta el inventario en cada venta.</p>
      <div className="mb-3 space-y-1.5">
        {ingredients.map(ing => {
          const qty = recipe.find(r => r.ingredientId === ing.id)?.qty ?? 0
          return (
            <div key={ing.id} className="flex items-center gap-2 rounded-xl bg-white px-3 py-2">
              <div className="min-w-0 flex-1 text-sm font-medium">{ing.name}</div>
              <Input
                type="number"
                inputMode="decimal"
                value={qty || ''}
                placeholder="0"
                onChange={e => setQty(ing.id, parseFloat(e.target.value) || 0)}
                className="w-20 py-1.5 text-right"
              />
              <span className="w-8 text-xs text-berry-700/60">{ing.unit}</span>
            </div>
          )
        })}
        {ingredients.length === 0 && (
          <p className="text-sm text-berry-700/60">Primero registra insumos en la pestaña Insumos.</p>
        )}
      </div>

      <div className="mb-3 rounded-xl bg-cream-200 px-4 py-3 text-sm">
        Costo por unidad: <b>{money(cost)}</b>
        {valid && (
          <>
            {' · '}Ganancia: <b className="text-green-700">{money(p - cost)}</b> ({p > 0 ? (((p - cost) / p) * 100).toFixed(0) : 0}%)
          </>
        )}
      </div>

      <label className="mb-3 flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="h-5 w-5 accent-berry-500" />
        Visible en el punto de venta
      </label>

      <Button className="w-full" disabled={!valid} onClick={save}>Guardar</Button>
      {product && (
        <Button
          variant="danger"
          className="mt-2 w-full"
          onClick={async () => {
            if (confirm(`¿Eliminar ${product.name}? Las ventas pasadas no se pierden.`)) {
              await deleteProduct(product.id)
              onClose()
            }
          }}
        >
          Eliminar producto
        </Button>
      )}
    </Sheet>
  )
}
