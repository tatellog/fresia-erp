import { useState } from 'react'
import type { Ingredient, Unit } from '../../data/types'
import { deleteIngredient, saveIngredient } from '../../services/inventory'
import { Button, Field, Input, Sheet } from '../../components/ui'

/** alta y edición de insumos */
export function IngredientFormSheet({ ing, onClose }: { ing?: Ingredient; onClose: () => void }) {
  const [name, setName] = useState(ing?.name ?? '')
  const [unit, setUnit] = useState<Unit>(ing?.unit ?? 'pza')
  const [cost, setCost] = useState(ing ? String(ing.cost) : '')
  const [minStock, setMinStock] = useState(ing ? String(ing.minStock) : '0')
  const valid = name.trim() && parseFloat(cost) >= 0

  const save = async () => {
    await saveIngredient({ name: name.trim(), unit, cost: parseFloat(cost), minStock: parseFloat(minStock) || 0 }, ing)
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
