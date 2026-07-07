import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import type { Employee } from '../../data/types'
import { setActiveEmployee } from '../../services/staff'
import { Button, Field, Input, Sheet } from '../../components/ui'

/** chip "Atiende · Nombre": cambia de empleada con PIN; invisible sin personal dado de alta */
export function AttendantChip() {
  const employees = useLiveQuery(() => db.employees.filter(e => e.active).toArray())
  const activeId = useLiveQuery(async () => (await db.meta.get('activeEmployeeId'))?.value)
  const [open, setOpen] = useState(false)
  const [who, setWho] = useState<Employee | null>(null)
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)

  if (!employees || employees.length === 0) return null
  const active = employees.find(e => e.id === activeId)

  const confirm = async () => {
    if (!who) return
    if (await setActiveEmployee(who, pin)) {
      setOpen(false)
      setWho(null)
      setPin('')
      setError(false)
    } else {
      setError(true)
      setPin('')
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="mb-3 inline-flex items-center gap-2 rounded-full border border-cream-300 bg-cream-50 px-3.5 py-1.5 text-xs font-medium tracking-wide text-berry-700"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-berry-500" />
        {active ? `Atiende · ${active.name}` : '¿Quién atiende?'}
      </button>

      <Sheet open={open} onClose={() => { setOpen(false); setWho(null); setPin(''); setError(false) }} title="¿Quién atiende?">
        {!who ? (
          <div className="grid grid-cols-2 gap-2">
            {employees.map(e => (
              <button
                key={e.id}
                onClick={() => setWho(e)}
                className={`rounded-2xl border px-4 py-5 font-display text-lg font-semibold ${
                  e.id === activeId ? 'border-berry-500 bg-berry-500 text-white' : 'border-cream-200 bg-cream-50'
                }`}
              >
                {e.name}
              </button>
            ))}
          </div>
        ) : (
          <>
            <p className="mb-3 text-sm text-berry-700/70">PIN de <b>{who.name}</b></p>
            <Field label="PIN (4 dígitos)">
              <Input
                type="password" inputMode="numeric" maxLength={4} autoFocus
                value={pin}
                onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setError(false) }}
                className="text-center text-2xl tracking-[0.5em]"
              />
            </Field>
            {error && <p className="mb-3 text-sm font-semibold text-red-600">PIN incorrecto</p>}
            <Button className="w-full" disabled={pin.length !== 4} onClick={confirm}>Entrar</Button>
          </>
        )}
      </Sheet>
    </>
  )
}
