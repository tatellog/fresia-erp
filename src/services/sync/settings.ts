import { db } from '../../data/db'

/** nombre de la sucursal a la que pertenece este dispositivo */
export async function getBranch(): Promise<string> {
  return (await db.meta.get('branch'))?.value || 'Principal'
}

export async function setBranch(name: string) {
  await db.meta.put({ key: 'branch', value: name.trim() || 'Principal' })
}
