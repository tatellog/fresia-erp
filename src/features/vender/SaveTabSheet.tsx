import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import { money } from '../../lib/format'
import { Button, Field, Input, Sheet } from '../../components/ui'

const RAPIDOS = ['Mesa 1', 'Mesa 2', 'Mesa 3', 'Mesa 4', 'Barra']

/** guardar el pedido como cuenta abierta para cobrarlo cuando el cliente termine */
export function SaveTabSheet({ total, count, initialName, editing, onSave, onClose }: {
  total: number
  count: number
  initialName?: string
  /** true cuando se guardan cambios de una cuenta que ya existía */
  editing: boolean
  onSave: (name: string) => Promise<void>
  onClose: () => void
}) {
  const [name, setName] = useState(initialName ?? '')
  const [busy, setBusy] = useState(false)
  const ocupados = useLiveQuery(async () => new Set((await db.openTabs.toArray()).map(t => t.name.trim().toLowerCase())))
  const repetido = !editing && !!name.trim() && ocupados?.has(name.trim().toLowerCase())

  const guardar = async () => {
    setBusy(true)
    try {
      await onSave(name)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Sheet open onClose={onClose} title={editing ? 'Guardar cambios de la cuenta' : 'Cobrar después'}>
      <p className="mb-4 text-sm text-berry-700/70">
        El pedido queda guardado y se cobra cuando el cliente termine. Los insumos se descuentan desde ahora porque ya se preparó.
      </p>
      <Field label="¿Cómo reconoces esta cuenta?">
        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Mesa 2, señora de rojo, grupo de 4…"
          autoFocus={!editing}
        />
      </Field>
      {!editing && (
        <div className="-mt-1 mb-4 flex flex-wrap gap-2">
          {RAPIDOS.filter(r => !ocupados?.has(r.toLowerCase())).map(r => (
            <button
              key={r}
              onClick={() => setName(r)}
              className={`rounded-full border px-3 py-1.5 text-[13px] font-medium transition-colors ${
                name === r ? 'border-berry-500 bg-berry-500 text-white' : 'border-cream-300 text-berry-700'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      )}
      {repetido && (
        <p className="-mt-2 mb-3 text-xs text-amber-700">Ya hay una cuenta abierta con ese nombre. Agrégale algo para distinguirlas.</p>
      )}
      <div className="mb-4 flex items-baseline justify-between rounded-2xl bg-cream-200/60 px-4 py-3">
        <span className="text-sm text-berry-700/70">{count} {count === 1 ? 'artículo' : 'artículos'}</span>
        <span className="font-display text-2xl font-bold tabular-nums">{money(total)}</span>
      </div>
      <Button className="w-full py-3.5" disabled={!name.trim() || busy || count === 0} onClick={guardar}>
        {editing ? 'Guardar cambios' : 'Guardar cuenta'}
      </Button>
    </Sheet>
  )
}
