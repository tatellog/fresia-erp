import { db } from '../data/db'
import { uid } from '../data/ids'
import type { Product } from '../data/types'
import { enqueue } from './outbox'

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
