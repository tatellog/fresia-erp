import { db } from '../data/db'
import { uid } from '../data/ids'
import type { Employee } from '../data/types'
import { enqueue } from './outbox'

export async function saveEmployee(data: Omit<Employee, 'id'>, existing?: Employee) {
  return db.transaction('rw', [db.employees, db.outbox], async () => {
    const row: Employee = existing ? { ...existing, ...data } : { ...data, id: uid() }
    await db.employees.put(row)
    await enqueue('employees', 'upsert', row)
  })
}

export async function deleteEmployee(id: string) {
  return db.transaction('rw', [db.employees, db.outbox, db.meta], async () => {
    await db.employees.delete(id)
    await enqueue('employees', 'delete', { id })
    if ((await db.meta.get('activeEmployeeId'))?.value === id) await db.meta.delete('activeEmployeeId')
  })
}

/** empleada activa en este dispositivo (firma ventas y aperturas de caja) */
export async function getActiveEmployee(): Promise<Employee | undefined> {
  const id = (await db.meta.get('activeEmployeeId'))?.value
  return id ? db.employees.get(id) : undefined
}

/** cambia la empleada activa; requiere su PIN */
export async function setActiveEmployee(employee: Employee, pin: string): Promise<boolean> {
  if (employee.pin !== pin) return false
  await db.meta.put({ key: 'activeEmployeeId', value: employee.id })
  return true
}
