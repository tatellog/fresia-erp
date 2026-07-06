import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, type Ingredient, type Unit } from '../db'
import { deleteIngredient, registerPurchase, registerWaste, saveIngredient } from '../lib/logic'
import { money, round2 } from '../lib/format'
import { Button, Card, Empty, Field, Input, Sheet } from '../components/ui'

type Action = { kind: 'compra' | 'merma'; ing: Ingredient } | { kind: 'editar'; ing?: Ingredient } | null

export default function Inventario() {
  const ingredients = useLiveQuery(() => db.ingredients.orderBy('name').toArray())
  const [action, setAction] = useState<Action>(null)

  if (!ingredients) return null
  const low = ingredients.filter(i => i.stock <= i.minStock)

  return (
    <div className="mx-auto max-w-2xl pt-2 lg:pt-0">
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-lg font-bold">Insumos</h1>
        <Button variant="soft" className="px-3 py-2 text-sm" onClick={() => setAction({ kind: 'editar' })}>
          + Nuevo insumo
        </Button>
      </div>

      {low.length > 0 && (
        <div className="mb-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">
          ⚠️ Stock bajo: {low.map(i => i.name).join(', ')}
        </div>
      )}

      {ingredients.length === 0 && <Empty emoji="📦" text="Registra tus insumos: fresas, crema, vasos…" />}

      <div className="space-y-2">
        {ingredients.map(ing => (
          <Card key={ing.id}>
            <div className="flex items-center justify-between">
              <button className="min-w-0 flex-1 text-left" onClick={() => setAction({ kind: 'editar', ing })}>
                <div className="font-semibold">{ing.name}</div>
                <div className="text-xs text-berry-700/60">
                  {money(ing.cost)} / {ing.unit} · mín. {ing.minStock} {ing.unit}
                </div>
              </button>
              <div className={`mx-3 text-right font-bold tabular-nums ${ing.stock <= ing.minStock ? 'text-amber-600' : ''}`}>
                {round2(ing.stock)} {ing.unit}
              </div>
              <div className="flex gap-1.5">
                <Button variant="soft" className="px-2.5 py-1.5 text-xs" onClick={() => setAction({ kind: 'compra', ing })}>
                  Compra
                </Button>
                <Button variant="ghost" className="px-2.5 py-1.5 text-xs" onClick={() => setAction({ kind: 'merma', ing })}>
                  Merma
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {action?.kind === 'compra' && <CompraSheet ing={action.ing} onClose={() => setAction(null)} />}
      {action?.kind === 'merma' && <MermaSheet ing={action.ing} onClose={() => setAction(null)} />}
      {action?.kind === 'editar' && <EditSheet ing={action.ing} onClose={() => setAction(null)} />}
    </div>
  )
}

function CompraSheet({ ing, onClose }: { ing: Ingredient; onClose: () => void }) {
  const [qty, setQty] = useState('')
  const [cost, setCost] = useState('')
  const q = parseFloat(qty), c = parseFloat(cost)
  const valid = q > 0 && c >= 0
  return (
    <Sheet open onClose={onClose} title={`Compra · ${ing.name}`}>
      <Field label={`Cantidad comprada (${ing.unit})`}>
        <Input type="number" inputMode="decimal" value={qty} onChange={e => setQty(e.target.value)} autoFocus />
      </Field>
      <Field label="Costo total de la compra ($)">
        <Input type="number" inputMode="decimal" value={cost} onChange={e => setCost(e.target.value)} />
      </Field>
      {valid && q > 0 && (
        <p className="mb-3 text-sm text-berry-700/70">
          Costo unitario de esta compra: <b>{money(c / q)}</b> / {ing.unit}
        </p>
      )}
      <Button className="w-full" disabled={!valid} onClick={async () => { await registerPurchase(ing.id, q, c); onClose() }}>
        Registrar compra
      </Button>
    </Sheet>
  )
}

function MermaSheet({ ing, onClose }: { ing: Ingredient; onClose: () => void }) {
  const [qty, setQty] = useState('')
  const [reason, setReason] = useState('')
  const q = parseFloat(qty)
  return (
    <Sheet open onClose={onClose} title={`Merma · ${ing.name}`}>
      <Field label={`Cantidad perdida (${ing.unit})`}>
        <Input type="number" inputMode="decimal" value={qty} onChange={e => setQty(e.target.value)} autoFocus />
      </Field>
      <Field label="Motivo">
        <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="Se echó a perder, caducó…" />
      </Field>
      <Button className="w-full" disabled={!(q > 0)} onClick={async () => { await registerWaste(ing.id, q, reason || 'Sin motivo'); onClose() }}>
        Registrar merma
      </Button>
    </Sheet>
  )
}

function EditSheet({ ing, onClose }: { ing?: Ingredient; onClose: () => void }) {
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
