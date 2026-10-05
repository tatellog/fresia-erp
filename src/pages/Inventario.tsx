import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import type { Ingredient } from '../data/types'
import { Button, Empty } from '../components/ui'
import { PlusIcon } from '../components/ui/icons'
import { IngredientRow } from '../features/inventario/IngredientRow'
import { AttentionRow, needsAttention } from '../features/inventario/AttentionRow'
import { RegistrarCompraSheet } from '../features/inventario/RegistrarCompraSheet'
import { MermaSheet } from '../features/inventario/MermaSheet'
import { IngredientFormSheet } from '../features/inventario/IngredientFormSheet'

type Action = { kind: 'compra'; ing?: Ingredient } | { kind: 'merma'; ing: Ingredient } | { kind: 'editar'; ing?: Ingredient } | null

/** cuántos avisos se ven antes de "ver todos" */
const VISIBLES = 6

/**
 * Inventario: primero las acciones y lo que necesita atención; la lista
 * completa de insumos queda a un toque. Las ventas descuentan solas por
 * receta, así que aquí casi solo se registran compras.
 */
export default function Inventario() {
  const ingredients = useLiveQuery(() => db.ingredients.orderBy('name').toArray())
  const hasPurchases = useLiveQuery(async () => (await db.purchases.count()) > 0)
  const [action, setAction] = useState<Action>(null)
  const [verTodo, setVerTodo] = useState(false)
  const [todosAvisos, setTodosAvisos] = useState(false)

  if (!ingredients || hasPurchases === undefined) return null
  const atencion = needsAttention(ingredients)
  const avisos = todosAvisos ? atencion : atencion.slice(0, VISIBLES)

  return (
    <div className="mx-auto max-w-2xl pt-2 lg:pt-0">
      <h1 className="mb-4 text-lg font-bold">Inventario</h1>

      <button
        onClick={() => setAction({ kind: 'compra' })}
        className="mb-6 flex w-full items-center gap-4 rounded-3xl bg-berry-500 px-5 py-4 text-left text-white shadow-sm transition-colors active:bg-berry-600"
      >
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/15">
          <PlusIcon className="h-5 w-5" />
        </span>
        <span>
          <span className="block font-semibold tracking-wide">Registrar compra</span>
          <span className="block text-xs text-white/75">Varios insumos de una vez: sube el inventario, el costo y el gasto</span>
        </span>
      </button>

      {!hasPurchases && ingredients.length > 0 && (
        <div className="mb-5 rounded-2xl bg-cream-200/70 px-4 py-3 text-sm text-berry-700/80">
          Registra tu primera compra: con ella se cargan las existencias y se calculan los costos y márgenes del menú.
        </div>
      )}

      <section className="mb-6">
        <h2 className="mb-2.5 flex items-center gap-2 text-base font-semibold">
          Necesitan atención
          {atencion.length > 0 && (
            <span className="rounded-full bg-berry-500 px-2 py-0.5 text-xs font-bold text-white">{atencion.length}</span>
          )}
        </h2>
        {atencion.length === 0 ? (
          <p className="rounded-2xl border border-cream-200 bg-cream-50 px-4 py-5 text-center text-sm text-berry-700/60">
            Todo en orden: ningún insumo está bajo su mínimo.
          </p>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-cream-200 bg-cream-50">
            {avisos.map((ing, i) => (
              <AttentionRow key={ing.id} ing={ing} first={i === 0} onCompra={() => setAction({ kind: 'compra', ing })} />
            ))}
            {atencion.length > VISIBLES && (
              <button
                onClick={() => setTodosAvisos(v => !v)}
                className="w-full border-t border-cream-200/70 px-4 py-3 text-sm font-medium text-berry-600"
              >
                {todosAvisos ? 'Ver menos' : `Ver los ${atencion.length - VISIBLES} restantes`}
              </button>
            )}
          </div>
        )}
      </section>

      <button
        onClick={() => setVerTodo(v => !v)}
        className="mb-3 flex w-full items-center justify-between rounded-2xl border border-cream-200 bg-cream-50 px-4 py-3.5 text-left"
      >
        <span className="font-semibold">Ver todo el inventario</span>
        <span className="text-sm text-berry-700/60">{ingredients.length} insumos · {verTodo ? 'ocultar' : 'mostrar'}</span>
      </button>

      {verTodo && (
        <>
          <div className="mb-2 flex justify-end">
            <Button variant="soft" className="px-3 py-2 text-sm" onClick={() => setAction({ kind: 'editar' })}>
              + Nuevo insumo
            </Button>
          </div>
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
        </>
      )}

      {action?.kind === 'compra' && <RegistrarCompraSheet ingredientId={action.ing?.id} onClose={() => setAction(null)} />}
      {action?.kind === 'merma' && <MermaSheet ing={action.ing} onClose={() => setAction(null)} />}
      {action?.kind === 'editar' && <IngredientFormSheet ing={action.ing} onClose={() => setAction(null)} />}
    </div>
  )
}
