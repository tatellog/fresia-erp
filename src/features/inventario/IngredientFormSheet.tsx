import { useState } from 'react'
import type { Ingredient, ToppingGroup, Unit } from '../../data/types'
import { deleteIngredient, saveIngredient } from '../../services/inventory'
import { Button, Field, Input, Sheet } from '../../components/ui'

/** alta y edición de insumos */
export function IngredientFormSheet({ ing, onClose }: { ing?: Ingredient; onClose: () => void }) {
  const [name, setName] = useState(ing?.name ?? '')
  const [unit, setUnit] = useState<Unit>(ing?.unit ?? 'pza')
  const [cost, setCost] = useState(ing ? String(ing.cost) : '0')
  const [minStock, setMinStock] = useState(ing ? String(ing.minStock) : '0')
  const [groups, setGroups] = useState<ToppingGroup[]>(ing?.toppingGroups ?? [])
  const [portion, setPortion] = useState(ing?.portion ? String(ing.portion) : '')
  const valid = name.trim() && parseFloat(cost) >= 0 && (groups.length === 0 || parseFloat(portion) > 0)

  const toggleGroup = (g: ToppingGroup) =>
    setGroups(prev => (prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]))

  const save = async () => {
    await saveIngredient({
      name: name.trim(),
      unit,
      cost: parseFloat(cost),
      minStock: parseFloat(minStock) || 0,
      toppingGroups: groups.length ? groups : undefined,
      portion: groups.length ? parseFloat(portion) : undefined,
    }, ing)
    onClose()
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
              onClick={() => setUnit(u)}
              className={`rounded-xl py-2.5 font-semibold ${unit === u ? 'bg-berry-500 text-white' : 'bg-cream-200 text-berry-700'}`}
            >
              {u === 'g' ? 'gramos' : u === 'ml' ? 'mililitros' : 'piezas'}
            </button>
          ))}
        </div>
      </Field>
      <Field label={`Costo por ${unit} ($)`}>
        <Input type="number" inputMode="decimal" value={cost} onChange={e => setCost(e.target.value)} />
      </Field>
      <Field label={`Avisarme cuando queden menos de (${unit})`}>
        <Input type="number" inputMode="decimal" value={minStock} onChange={e => setMinStock(e.target.value)} />
      </Field>
      <Field label="¿Es topping elegible en el punto de venta?">
        <div className="grid grid-cols-2 gap-2">
          {(['clasica', 'balance'] as ToppingGroup[]).map(g => (
            <button
              key={g}
              onClick={() => toggleGroup(g)}
              className={`rounded-xl py-2.5 font-semibold capitalize ${
                groups.includes(g) ? 'bg-berry-500 text-white' : 'bg-cream-200 text-berry-700'
              }`}
            >
              {g === 'clasica' ? 'Clásica' : 'Balance'}
            </button>
          ))}
        </div>
      </Field>
      {groups.length > 0 && (
        <Field label={`Porción por vaso (${unit})`}>
          <Input type="number" inputMode="decimal" value={portion} onChange={e => setPortion(e.target.value)} />
        </Field>
      )}
      <Button className="w-full" disabled={!valid} onClick={save}>
        Guardar
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
