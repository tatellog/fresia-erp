import type { Unit } from '../data/types'
import { money } from '../lib/format'

/** unidad de compra a granel: la fresa se compra en kg aunque la receta use g */
export const bulkUnit = (u: Unit): 'kg' | 'L' | undefined => (u === 'g' ? 'kg' : u === 'ml' ? 'L' : undefined)

/** costo por unidad legible: $65/kg en vez de $0.07/g */
export const fmtUnitCost = (perUnit: number, u: Unit) => {
  const grande = bulkUnit(u)
  return grande ? `${money(perUnit * 1000)}/${grande}` : `${money(perUnit)}/${u}`
}

/** cantidad legible: 6.2 kg, 750 ml, 18 pzas */
export const fmtQty = (qty: number, u: Unit) => {
  const grande = bulkUnit(u)
  const r = (n: number) => Math.round(n * 10) / 10
  if (grande && Math.abs(qty) >= 1000) return `${r(qty / 1000).toLocaleString('es-MX')} ${grande}`
  if (u === 'pza') return `${Math.round(qty).toLocaleString('es-MX')} ${Math.abs(Math.round(qty)) === 1 ? 'pza' : 'pzas'}`
  return `${Math.round(qty).toLocaleString('es-MX')} ${u}`
}
