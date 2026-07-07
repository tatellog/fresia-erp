import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import type { Employee } from '../../data/types'
import { deleteEmployee, saveEmployee } from '../../services/staff'
import { Button, Card, Field, Input, Sheet } from '../../components/ui'

/** alta y administración del personal que atiende (PIN de 4 dígitos) */
export function EmployeesCard() {
  const employees = useLiveQuery(() => db.employees.toArray())
  const [editing, setEditing] = useState<Employee | 'new' | null>(null)

  if (!employees) return null

  return (
    <Card className="mb-3">
      <div className="mb-1 flex items-center justify-between">
        <h2 className="font-bold">Personal</h2>
        <Button variant="soft" className="px-3 py-1.5 text-xs" onClick={() => setEditing('new')}>+ Agregar</Button>
      </div>
      <p className="mb-3 text-sm text-berry-700/70">
        Cada quien entra con su PIN en el punto de venta; sus ventas y cortes quedan a su nombre.
      </p>
      {employees.length === 0 ? (
        <p className="text-sm text-berry-700/50">Sin personal registrado: las ventas no piden PIN.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {employees.map(e => (
            <button
              key={e.id}
              onClick={() => setEditing(e)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium ${
                e.active ? 'border-cream-300 bg-cream-50' : 'border-cream-200 bg-cream-200/50 text-berry-900/40'
              }`}
            >
              {e.name}
            </button>
          ))}
        </div>
      )}
      {editing && <EmployeeSheet employee={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </Card>
  )
}

function EmployeeSheet({ employee, onClose }: { employee?: Employee; onClose: () => void }) {
  const [name, setName] = useState(employee?.name ?? '')
  const [pin, setPin] = useState(employee?.pin ?? '')
  const [active, setActive] = useState(employee?.active ?? true)
  const valid = name.trim() && /^\d{4}$/.test(pin)

  return (
    <Sheet open onClose={onClose} title={employee ? `Editar · ${employee.name}` : 'Nueva integrante'}>
      <Field label="Nombre">
        <Input value={name} onChange={e => setName(e.target.value)} autoFocus={!employee} />
      </Field>
      <Field label="PIN (4 dígitos)">
        <Input
          inputMode="numeric" maxLength={4} value={pin}
          onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
          className="w-32 text-center text-xl tracking-[0.4em]"
        />
      </Field>
      <label className="mb-4 flex items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} className="h-5 w-5 accent-berry-500" />
        Activa (aparece en el punto de venta)
      </label>
      <Button className="w-full" disabled={!valid}
        onClick={async () => { await saveEmployee({ name: name.trim(), pin, active }, employee); onClose() }}>
        Guardar
      </Button>
      {employee && (
        <Button variant="danger" className="mt-2 w-full"
          onClick={async () => {
            if (confirm(`¿Eliminar a ${employee.name}? Sus ventas pasadas conservan su nombre.`)) {
              await deleteEmployee(employee.id)
              onClose()
            }
          }}>
          Eliminar
        </Button>
      )}
    </Sheet>
  )
}
