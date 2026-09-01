import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import type { Product } from '../data/types'
import { productLine } from '../services/catalog'
import { productCost } from '../services/costing'
import { Button, Empty } from '../components/ui'
import { ProductRow } from '../features/productos/ProductRow'
import { ProductFormSheet } from '../features/productos/ProductFormSheet'

const lineDefs: { key: string; title: string; dot: string }[] = [
  { key: 'nogada', title: 'Frésia en Nogada · del mes', dot: 'var(--line-nogada)' },
  { key: 'clasica', title: 'Frésia Clásica', dot: 'var(--color-berry-500)' },
  { key: 'uvas', title: 'Uvas', dot: 'var(--line-uva)' },
  { key: 'mix', title: 'Mix Frésia', dot: 'var(--line-mix)' },
  { key: 'balance', title: 'Frésia Balance', dot: 'var(--line-olive)' },
  { key: 'chocolate', title: 'Frésia Chocolate', dot: 'var(--line-choco)' },
  { key: 'brulee', title: 'Frèsia Brûlée', dot: 'var(--line-brulee)' },
  { key: 'waffle', title: 'Waffle Frésia', dot: 'var(--line-waffle)' },
  { key: 'bebidas', title: 'Bebidas', dot: 'var(--line-te)' },
  { key: 'despensa', title: 'Despensa', dot: 'var(--line-miel)' },
  { key: 'otros', title: 'Otros', dot: 'var(--color-blush)' },
]

export default function Productos() {
  const products = useLiveQuery(() => db.products.orderBy('sort').toArray())
  const ingredients = useLiveQuery(() => db.ingredients.toArray())
  const [editing, setEditing] = useState<Product | 'new' | null>(null)

  if (!products || !ingredients) return null
  const ingMap = new Map(ingredients.map(i => [i.id, i]))

  const secciones = lineDefs
    .map(d => ({ ...d, items: products.filter(p => (productLine(p) ?? 'otros') === d.key) }))
    .filter(d => d.items.length > 0)
  const sinCostos = products.length > 0 && products.every(p => productCost(p, ingMap) === 0)

  return (
    <div className="mx-auto max-w-2xl pt-2 lg:pt-0">
      <div className="mb-1 flex items-center justify-between">
        <h1 className="text-lg font-bold">Menú y costos</h1>
        <Button variant="soft" className="px-3 py-2 text-sm" onClick={() => setEditing('new')}>
          + Nuevo producto
        </Button>
      </div>
      {sinCostos && (
        <p className="mb-4 text-xs text-berry-700/55">
          El costo y la ganancia de cada vaso se calculan solos cuando registras compras de insumos.
        </p>
      )}

      {products.length === 0 && <Empty text="Crea tu primer producto con su receta." />}

      {secciones.map(sec => (
        <section key={sec.key} className="mb-7 mt-4">
          <h2 className="mb-2.5 flex items-center gap-2 text-base font-semibold">
            <span className="h-2 w-2 rounded-full" style={{ background: sec.dot }} />
            {sec.title}
            <span className="text-xs font-normal text-berry-700/45">
              {sec.items.length} {sec.key === 'bebidas' || sec.key === 'despensa' ? (sec.items.length === 1 ? 'producto' : 'productos') : (sec.items.length === 1 ? 'tamaño' : 'tamaños')}
            </span>
          </h2>
          <div className="space-y-2">
            {sec.items.map(p => (
              <ProductRow key={p.id} product={p} ingredients={ingMap} onEdit={() => setEditing(p)} />
            ))}
          </div>
        </section>
      ))}

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
