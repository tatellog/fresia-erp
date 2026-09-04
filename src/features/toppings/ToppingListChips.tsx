import { useState } from 'react'
import type { ToppingGroup, ToppingList } from '../../data/types'
import { createToppingList } from '../../services/toppingLists'
import { Button, Input } from '../../components/ui'

/**
 * Selector de listas de toppings con opción de crear una nueva ahí mismo.
 * Sirve tanto para elegir una (producto) como varias (insumo).
 */
export function ToppingListChips({ lists, selected, counts, onToggle, onCreated }: {
  lists: ToppingList[]
  selected: ToppingGroup[]
  /** toppings asignados por lista, para mostrarlo en cada chip */
  counts?: Map<ToppingGroup, number>
  onToggle: (id: ToppingGroup) => void
  onCreated: (id: ToppingGroup) => void
}) {
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')

  const create = async () => {
    if (!name.trim()) return
    const id = await createToppingList(name)
    setName('')
    setCreating(false)
    onCreated(id)
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {lists.map(l => {
          const on = selected.includes(l.id)
          const n = counts?.get(l.id)
          return (
            <button
              key={l.id}
              type="button"
              onClick={() => onToggle(l.id)}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${on ? 'bg-berry-500 text-white' : 'bg-cream-200 text-berry-700'}`}
            >
              {l.name}
              {counts && (
                <span className={`ml-1.5 font-normal ${on ? 'text-white/75' : 'text-berry-700/55'}`}>
                  · {n ?? 0} {n === 1 ? 'topping' : 'toppings'}
                </span>
              )}
            </button>
          )
        })}
        {!creating && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="rounded-xl border border-dashed border-berry-300 px-4 py-2.5 text-sm font-semibold text-berry-700"
          >
            + Nueva lista
          </button>
        )}
      </div>
      {creating && (
        <div className="mt-2 flex gap-2">
          <Input
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') void create() }}
            placeholder="Nombre de la lista, por ejemplo Frutas"
            className="py-2"
            autoFocus
          />
          <Button className="shrink-0 px-4" disabled={!name.trim()} onClick={create}>Crear</Button>
          <Button variant="soft" className="shrink-0 px-3" onClick={() => { setCreating(false); setName('') }}>Cancelar</Button>
        </div>
      )}
    </div>
  )
}
