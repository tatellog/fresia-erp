import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import type { Ingredient, ToppingGroup, Unit } from '../../data/types'
import { deleteIngredient, saveIngredient } from '../../services/inventory'
import { Button, decimal as num, Field, Input, NumberInput, Sheet } from '../../components/ui'
import { ToppingListChips } from '../toppings/ToppingListChips'

/** alta y edición de insumos */
export function IngredientFormSheet({ ing, onClose }: { ing?: Ingredient; onClose: () => void }) {
  const lists = useLiveQuery(() => db.toppingLists.orderBy('sort').toArray())
  const [name, setName] = useState(ing?.name ?? '')
  const [unit, setUnit] = useState<Unit>(ing?.unit ?? 'pza')
  const [cost, setCost] = useState(ing ? String(ing.cost) : '0')
  const [minStock, setMinStock] = useState(ing ? String(ing.minStock) : '0')
  const [groups, setGroups] = useState<ToppingGroup[]>(ing?.toppingGroups ?? [])
  const [portion, setPortion] = useState(ing?.portion ? String(ing.portion) : '')
  const [premium, setPremium] = useState(ing?.premiumPrice ? String(ing.premiumPrice) : '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const otros = useLiveQuery(() => db.ingredients.toArray(), []) ?? []

  const esTopping = groups.length > 0
  const limpio = name.trim()
  /** qué falta para poder guardar; vacío = listo (el botón nunca queda mudo sin decir por qué) */
  const falta = !limpio
    ? 'Escribe el nombre del insumo.'
    : otros.some(o => o.id !== ing?.id && o.name.trim().toLowerCase() === limpio.toLowerCase())
      ? 'Ya existe un insumo con ese nombre.'
      : esTopping && num(portion) <= 0
        ? `Escribe la porción por vaso en ${unit} (cuánto se sirve de este topping).`
        : ''

  const toggleGroup = (g: ToppingGroup) =>
    setGroups(prev => (prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]))

  if (!lists) return null

  const save = async () => {
    if (falta) return setError(falta)
    setSaving(true)
    setError('')
    try {
      await saveIngredient({
        name: limpio,
        unit,
        cost: num(cost),
        minStock: num(minStock),
        toppingGroups: esTopping ? groups : undefined,
        portion: esTopping ? num(portion) : undefined,
        premiumPrice: esTopping && num(premium) > 0 ? num(premium) : undefined,
      }, ing)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el insumo.')
      setSaving(false)
    }
  }

  return (
    <Sheet open onClose={onClose} title={ing ? `Editar · ${ing.name}` : 'Nuevo insumo'}>
      <Field label="Nombre">
        <Input value={name} onChange={e => setName(e.target.value)} placeholder="Fresa, Crema, Vaso…" autoFocus={!ing} />
      </Field>
      <Field label="Unidad de medida">
        <div className="grid grid-cols-3 gap-2">
          {(['g', 'ml', 'pza'] as Unit[]).map(u => (
            <button
              key={u}
              type="button"
              onClick={() => setUnit(u)}
              className={`rounded-xl py-2.5 font-semibold ${unit === u ? 'bg-berry-500 text-white' : 'bg-cream-200 text-berry-700'}`}
            >
              {u === 'g' ? 'gramos' : u === 'ml' ? 'mililitros' : 'piezas'}
            </button>
          ))}
        </div>
      </Field>
      <Field label={`Costo por ${unit} ($)`}>
        <NumberInput value={cost} onChange={e => setCost(e.target.value)} placeholder="0" />
      </Field>
      <Field label={`Avisarme cuando queden menos de (${unit})`}>
        <NumberInput value={minStock} onChange={e => setMinStock(e.target.value)} placeholder="0" />
      </Field>
      <Field label="¿Es un topping que el cliente puede elegir? Marca en qué listas aparece">
        <ToppingListChips
          lists={lists}
          selected={groups}
          onToggle={toggleGroup}
          onCreated={id => setGroups(prev => [...prev, id])}
        />
      </Field>
      {esTopping && (
        <>
          <Field label={`Porción por vaso (${unit})`}>
            <NumberInput value={portion} onChange={e => setPortion(e.target.value)} placeholder={`Ej. 20 ${unit}`} />
          </Field>
          <Field label="Precio premium ($, vacío = va en los incluidos)">
            <NumberInput value={premium} onChange={e => setPremium(e.target.value)} placeholder="0" />
          </Field>
        </>
      )}
      {(error || falta) && (
        <p className="mb-2 rounded-xl bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">{error || falta}</p>
      )}
      <Button className="w-full" disabled={saving || !!falta} onClick={save}>
        {saving ? 'Guardando…' : 'Guardar'}
      </Button>
      {ing && (
        <Button
          variant="danger"
          className="mt-2 w-full"
          onClick={async () => {
            if (confirm(`¿Eliminar ${ing.name}? Las recetas que lo usan dejarán de contarlo.`)) {
              await deleteIngredient(ing.id)
              onClose()
            }
          }}
        >
          Eliminar insumo
        </Button>
      )}
    </Sheet>
  )
}
