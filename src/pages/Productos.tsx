import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Product, type RecipeItem } from '../db'
import { productCost } from '../lib/logic'
import { money } from '../lib/format'
import { Button, Card, Empty, Field, Input, Sheet } from '../components/ui'

export default function Productos() {
  const products = useLiveQuery(() => db.products.orderBy('sort').toArray())
  const ingredients = useLiveQuery(() => db.ingredients.toArray())
  const [editing, setEditing] = useState<Product | 'new' | null>(null)

  if (!products || !ingredients) return null
  const ingMap = new Map(ingredients.map(i => [i.id, i]))

  return (
    <div className="pt-2">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">Menú y costos</h1>
        <Button variant="soft" className="px-3 py-2 text-sm" onClick={() => setEditing('new')}>
          + Nuevo producto
        </Button>
      </div>

      {products.length === 0 && <Empty emoji="🍨" text="Crea tu primer producto con su receta." />}

      <div className="space-y-2">
        {products.map(p => {
          const cost = productCost(p, ingMap)
          const margin = p.price > 0 ? ((p.price - cost) / p.price) * 100 : 0
          return (
            <Card key={p.id} onClick={() => setEditing(p)} className={`cursor-pointer ${p.active ? '' : 'opacity-45'}`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{p.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{p.name}</div>
                  <div className="text-xs text-berry-700/60">
                    Costo {money(cost)} · Margen {margin.toFixed(0)}%{!p.active && ' · pausado'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-berry-500">{money(p.price)}</div>
                  <div className="text-xs font-medium text-green-700">+{money(p.price - cost)}</div>
                </div>
              </div>
            </Card>
          )
        })}
      </div>

      {editing && (
        <EditProduct
          product={editing === 'new' ? undefined : editing}
          nextSort={products.length + 1}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

function EditProduct({ product, nextSort, onClose }: { product?: Product; nextSort: number; onClose: () => void }) {
  const ingredients = useLiveQuery(() => db.ingredients.orderBy('name').toArray())
  const [name, setName] = useState(product?.name ?? '')
  const [emoji, setEmoji] = useState(product?.emoji ?? '🍓')
  const [price, setPrice] = useState(product ? String(product.price) : '')
  const [active, setActive] = useState(product?.active ?? true)
  const [recipe, setRecipe] = useState<RecipeItem[]>(product?.recipe ?? [])

  if (!ingredients) return null
  const ingMap = new Map(ingredients.map(i => [i.id, i]))
  const cost = recipe.reduce((s, r) => s + (ingMap.get(r.ingredientId)?.cost ?? 0) * r.qty, 0)
  const p = parseFloat(price)
  const valid = name.trim() && p > 0

  const setQty = (ingredientId: number, qty: number) => {
    setRecipe(prev => {
      const rest = prev.filter(r => r.ingredientId !== ingredientId)
      return qty > 0 ? [...rest, { ingredientId, qty }] : rest
    })
  }

  const save = async () => {
    const data = { name: name.trim(), emoji: emoji || '🍓', price: p, recipe, active }
    if (product) await db.products.update(product.id, data)
    else await db.products.add({ ...data, sort: nextSort } as Product)
    onClose()
  }

  return (
    <Sheet open onClose={onClose} title={product ? `Editar · ${product.name}` : 'Nuevo producto'}>
      <div className="mb-3 flex gap-2">
        <Field label="Emoji">
          <Input value={emoji} onChange={e => setEmoji(e.target.value)} className="w-16 text-center" />
        </Field>
        <div className="flex-1">
          <Field label="Nombre">
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Fresas con crema — Chica" autoFocus={!product} />
          </Field>
        </div>
      </div>
      <Field label="Precio de venta ($)">
        <Input type="number" inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)} />
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
              await db.products.delete(product.id)
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
