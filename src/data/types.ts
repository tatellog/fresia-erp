// Tipos del dominio de Fresia. Sin dependencias: cualquier capa puede importarlos.

export type Unit = 'g' | 'ml' | 'pza'
export type Payment = 'efectivo' | 'tarjeta' | 'transferencia'

export interface Ingredient {
  id: string
  name: string
  unit: Unit
  /** existencia actual, en `unit` */
  stock: number
  /** costo promedio ponderado por unidad */
  cost: number
  /** alerta de stock mínimo */
  minStock: number
}

export interface RecipeItem {
  ingredientId: string
  qty: number
}

export interface Product {
  id: string
  name: string
  emoji: string
  price: number
  /** insumos que consume una unidad vendida */
  recipe: RecipeItem[]
  active: boolean
  sort: number
}

export interface SaleItem {
  productId: string
  name: string
  qty: number
  price: number
  /** costo de insumos al momento de la venta */
  cost: number
}

export interface Sale {
  id: string
  ts: number
  items: SaleItem[]
  total: number
  cost: number
  payment: Payment
  sessionId?: string
}

export interface Purchase {
  id: string
  ts: number
  ingredientId: string
  ingredientName: string
  qty: number
  totalCost: number
  note?: string
}

export interface Waste {
  id: string
  ts: number
  ingredientId: string
  ingredientName: string
  qty: number
  reason: string
}

export interface Expense {
  id: string
  ts: number
  concept: string
  amount: number
  sessionId?: string
}

export interface CashSession {
  id: string
  openTs: number
  closeTs?: number
  openAmount: number
  /** efectivo contado al cierre */
  closeAmount?: number
  /** efectivo esperado al cierre (fondo + ventas efectivo − gastos) */
  expected?: number
}

/** tablas del dominio que se sincronizan con la nube */
export type SyncTable =
  | 'ingredients' | 'products' | 'sales' | 'purchases' | 'wastes' | 'expenses' | 'cashSessions'

export const DOMAIN_TABLES: SyncTable[] = [
  'ingredients', 'products', 'sales', 'purchases', 'wastes', 'expenses', 'cashSessions',
]

/** cola de cambios pendientes de subir a Supabase */
export interface OutboxEntry {
  seq: number
  table: SyncTable
  op: 'upsert' | 'delete'
  /** fila completa (upsert) o { id } (delete) */
  row: Record<string, unknown>
  ts: number
}

export interface MetaEntry {
  key: string
  value: string
}
