import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import type { Ingredient, InventoryKind, ToppingGroup, Unit } from '../../data/types'
import { ingredientKind, KIND_LABEL } from '../../services/stock'
import { bulkUnit, fmtQty, fmtUnitCost } from '../../services/units'
import { suggestedMinStock } from '../../services/suggestions'
import { useStock } from './useStock'
import { deleteIngredient, saveIngredient } from '../../services/inventory'
import { Button, decimal as num, Field, Input, NumberInput, Sheet } from '../../components/ui'
import { ToppingListChips } from '../toppings/ToppingListChips'

/** alta y edición de insumos */
export function IngredientFormSheet({ ing, onClose }: { ing?: Ingredient; onClose: () => void }) {
  const lists = useLiveQuery(() => db.toppingLists.orderBy('sort').toArray())
  const [name, setName] = useState(ing?.name ?? '')
  const [unit, setUnit] = useState<Unit>(ing?.unit ?? 'pza')
  // sin elegir, se deduce del nombre y la unidad al guardar
  const [kind, setKind] = useState<InventoryKind | undefined>(ing?.kind)
  // el costo sale de las compras; escribirlo es la excepción (insumo nuevo o corrección)
  const [corrigiendo, setCorrigiendo] = useState(!ing || ing.cost === 0)
  const grande = bulkUnit(unit)
  const [cost, setCost] = useState(ing && ing.cost > 0 ? String(Math.round(ing.cost * (bulkUnit(ing.unit) ? 1000 : 1) * 100) / 100) : '')
  const [minStock, setMinStock] = useState(ing ? String(ing.minStock) : '0')
  const [groups, setGroups] = useState<ToppingGroup[]>(ing?.toppingGroups ?? [])
  const [portion, setPortion] = useState(ing?.portion ? String(ing.portion) : '')
  const [premium, setPremium] = useState(ing?.premiumPrice ? String(ing.premiumPrice) : '')
  const [incluido, setIncluido] = useState(!!ing?.included)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const otros = useLiveQuery(() => db.ingredients.toArray(), []) ?? []
  const stock = useStock()
  const sugerido = ing ? suggestedMinStock(stock?.usage.get(ing.id), unit) : undefined

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
        cost: incluido ? 0 : corrigiendo ? num(cost) / (grande ? 1000 : 1) : ing?.cost ?? 0,
        // false (no ausente) al desmarcar, para que se suba el cambio
        included: incluido || (ing?.included ? false : undefined),
        minStock: num(minStock),
        kind,
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
      <Field label="Qué tanto control lleva">
        <div className="grid grid-cols-3 gap-2">
          {(['critico', 'empaque', 'consumible'] as InventoryKind[]).map(k => {
            const on = (kind ?? ingredientKind({ name, unit })) === k
            return (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`rounded-xl py-2.5 font-semibold ${on ? 'bg-berry-500 text-white' : 'bg-cream-200 text-berry-700'}`}
              >
                {KIND_LABEL[k]}
              </button>
            )
          })}
        </div>
        <span className="mt-1.5 block text-xs text-berry-700/55">
          {{
            critico: 'Se cuenta en el conteo semanal y se le sigue la merma (fresa, crema, chocolate).',
            empaque: 'Se descuenta en cada venta y se cuenta de vez en cuando (vasos, tapas, stickers).',
            consumible: 'Solo se marca si hay, queda poco o se acabó (servilletas, cucharas).',
          }[kind ?? ingredientKind({ name, unit })]}
        </span>
      </Field>
      <label className="mb-3 flex items-start gap-2 text-sm font-medium">
        <input type="checkbox" checked={incluido} onChange={e => setIncluido(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-berry-500" />
        <span>
          No cuesta: viene incluido con otro insumo
          <span className="block text-xs font-normal text-berry-700/55">Por ejemplo, las tapas que vienen con los vasos. Se sigue descontando del inventario.</span>
        </span>
      </label>
      {incluido ? null : corrigiendo ? (
        <Field label={`Precio por ${grande ?? 'pieza'} ($)${ing ? '' : ' · opcional'}`}>
          <NumberInput value={cost} onChange={e => setCost(e.target.value)} placeholder={ing ? '' : 'Si ya lo sabes; si no, sale de la primera compra'} />
        </Field>
      ) : (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-xl bg-cream-200/60 px-3 py-2.5">
          <div>
            <div className="text-sm font-medium text-berry-700">Costo: {fmtUnitCost(ing!.cost, ing!.unit)}</div>
            <div className="text-xs text-berry-700/60">Se calcula solo con cada compra registrada.</div>
          </div>
          <button type="button" onClick={() => setCorrigiendo(true)} className="shrink-0 text-sm font-medium text-berry-600">Corregir</button>
        </div>
      )}
      <Field label={`Avisarme cuando queden menos de (${unit})`}>
        <NumberInput value={minStock} onChange={e => setMinStock(e.target.value)} placeholder="0" />
      </Field>
      {sugerido !== undefined && num(minStock) !== sugerido && (
        <button
          type="button"
          onClick={() => setMinStock(String(sugerido))}
          className="-mt-1 mb-3 rounded-full border border-cream-300 px-3 py-1.5 text-xs text-berry-700 active:bg-cream-200"
        >
          Usar {fmtQty(sugerido, unit)}: lo que se gasta en 2 días
        </button>
      )}
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
