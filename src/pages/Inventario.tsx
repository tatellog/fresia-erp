import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import type { Ingredient } from '../data/types'
import { Button, Empty } from '../components/ui'
import { IngredientRow } from '../features/inventario/IngredientRow'
import { CompraSheet } from '../features/inventario/CompraSheet'
import { MermaSheet } from '../features/inventario/MermaSheet'
import { IngredientFormSheet } from '../features/inventario/IngredientFormSheet'

type Action = { kind: 'compra' | 'merma'; ing: Ingredient } | { kind: 'editar'; ing?: Ingredient } | null

export default function Inventario() {
  const ingredients = useLiveQuery(() => db.ingredients.orderBy('name').toArray())
  const hasPurchases = useLiveQuery(async () => (await db.purchases.count()) > 0)
  const [action, setAction] = useState<Action>(null)

  if (!ingredients || hasPurchases === undefined) return null
  const low = ingredients.filter(i => i.stock <= i.minStock)

  return (
    <div className="mx-auto max-w-2xl pt-2 lg:pt-0">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">Insumos</h1>
        <Button variant="soft" className="px-3 py-2 text-sm" onClick={() => setAction({ kind: 'editar' })}>
          + Nuevo insumo
        </Button>
      </div>

      {!hasPurchases ? (
        <div className="mb-3 rounded-2xl bg-cream-200/70 px-4 py-3 text-sm text-berry-700/80">
          Empieza registrando tus <b>compras iniciales</b> (botón Compra en cada insumo): con eso se cargan las
          existencias y se calculan los costos y márgenes reales.
        </div>
      ) : low.length > 0 && (
        <div className="mb-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          Stock bajo: {low.slice(0, 4).map(i => i.name).join(', ')}{low.length > 4 && ` y ${low.length - 4} más`}
        </div>
      )}

      {ingredients.length === 0 && <Empty text="Registra tus insumos: fresas, crema, vasos…" />}

      <div className="space-y-2">
        {ingredients.map(ing => (
          <IngredientRow
            key={ing.id}
            ing={ing}
            onEdit={() => setAction({ kind: 'editar', ing })}
            onCompra={() => setAction({ kind: 'compra', ing })}
            onMerma={() => setAction({ kind: 'merma', ing })}
          />
        ))}
      </div>

      {action?.kind === 'compra' && <CompraSheet ing={action.ing} onClose={() => setAction(null)} />}
      {action?.kind === 'merma' && <MermaSheet ing={action.ing} onClose={() => setAction(null)} />}
      {action?.kind === 'editar' && <IngredientFormSheet ing={action.ing} onClose={() => setAction(null)} />}
    </div>
  )
}
