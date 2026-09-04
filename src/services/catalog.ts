import { db } from '../data/db'
import { uid } from '../data/ids'
import type { Line, Product } from '../data/types'
import { enqueue } from './outbox'

/**
 * Línea de un producto, con inferencia para catálogos guardados antes de
 * que existiera el campo `line` (evita que un menú viejo se vea roto).
 */
export function productLine(p: Product): Line | undefined {
  if (p.line) return p.line
  if (p.extraScope?.length) return undefined
  const n = p.name.toLowerCase()
  if (n.includes('brûlée') || n.includes('brulee')) return 'brulee'
  if (n.includes('nogada')) return 'nogada'
  if (n.startsWith('mix')) return 'mix'
  if (n.startsWith('waffle')) return 'waffle'
  if (/^t[eé]\b/.test(n) || n.startsWith('agua')) return 'bebidas'
  if (n.startsWith('miel') || n.startsWith('pepita')) return 'despensa'
  if (n.startsWith('uvas')) return 'uvas'
  if (n.startsWith('granada')) return 'granada'
  if (n.startsWith('balance')) return 'balance'
  if (n.startsWith('choco')) return 'chocolate'   // Choco Crema y Chocolate Turín
  if (n.startsWith('clásica') || n.startsWith('clasica')) return 'clasica'
  if (p.toppingGroup === 'balance') return 'balance'
  if (p.toppingGroup === 'clasica') return 'clasica'
  return undefined
}

export async function saveProduct(data: Omit<Product, 'id' | 'sort'>, existing?: Product, nextSort = 1) {
  return db.transaction('rw', [db.products, db.outbox], async () => {
    const row: Product = existing ? { ...existing, ...data } : { ...data, id: uid(), sort: nextSort }
    await db.products.put(row)
    await enqueue('products', 'upsert', row)
  })
}

export async function deleteProduct(id: string) {
  return db.transaction('rw', [db.products, db.outbox], async () => {
    await db.products.delete(id)
    await enqueue('products', 'delete', { id })
  })
}
