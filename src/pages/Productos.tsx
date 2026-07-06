import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import type { Product } from '../data/types'
import { Button, Empty } from '../components/ui'
import { ProductRow } from '../features/productos/ProductRow'
import { ProductFormSheet } from '../features/productos/ProductFormSheet'

export default function Productos() {
  const products = useLiveQuery(() => db.products.orderBy('sort').toArray())
  const ingredients = useLiveQuery(() => db.ingredients.toArray())
  const [editing, setEditing] = useState<Product | 'new' | null>(null)

  if (!products || !ingredients) return null
  const ingMap = new Map(ingredients.map(i => [i.id, i]))

  return (
    <div className="mx-auto max-w-2xl pt-2 lg:pt-0">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">Menú y costos</h1>
        <Button variant="soft" className="px-3 py-2 text-sm" onClick={() => setEditing('new')}>
          + Nuevo producto
        </Button>
      </div>

      {products.length === 0 && <Empty text="Crea tu primer producto con su receta." />}

      <div className="space-y-2">
        {products.map(p => (
          <ProductRow key={p.id} product={p} ingredients={ingMap} onEdit={() => setEditing(p)} />
        ))}
      </div>

      {editing && (
        <ProductFormSheet
          product={editing === 'new' ? undefined : editing}
          nextSort={products.length + 1}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
