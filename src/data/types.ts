// Tipos del dominio de Fresia. Sin dependencias: cualquier capa puede importarlos.

export type Unit = 'g' | 'ml' | 'pza'
export type Payment = 'efectivo' | 'tarjeta' | 'transferencia' | 'rappi' | 'uber' | 'didi'
/** id de una lista de toppings elegibles (ver ToppingList); 'clasica' y 'balance' son las originales */
export type ToppingGroup = string

/** lista de toppings que se le ofrece al cliente al vender un producto */
export interface ToppingList {
  id: ToppingGroup
  name: string
  sort: number
}
/** líneas de producto del menú */
export type Line =
  | 'clasica' | 'chocolate' | 'balance' | 'brulee' | 'uvas' | 'mix'
  | 'granada'  // granada desgranada + crema, precios de Clásica
  | 'nogada'   // Frésia del mes (edición limitada)
  | 'waffle'
  | 'bebidas'  // tés y agua
  | 'despensa' // miel y pepitas

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
  /** si es topping elegible en el POS, en qué listas aparece */
  toppingGroups?: ToppingGroup[]
  /** porción que consume una selección de topping, en `unit` */
  portion?: number
  /** topping premium (Pistache, Lotus): siempre se cobra este precio y no gasta un incluido */
  premiumPrice?: number
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
  /** si el producto lleva toppings elegibles, de qué lista escoge el cliente */
  toppingGroup?: ToppingGroup
  /** toppings incluidos en el precio; ausente = INCLUDED_TOPPINGS (la Nogada incluye 1: la nuez ocupa el otro) */
  includedToppings?: number
  /** ids de toppings premium que en este producto van sin cargo y ocupan un incluido (el Waffle: Turín y mermeladas) */
  freePremium?: string[]
  /** línea del menú a la que pertenece (vasos) */
  line?: Line
  /** si es un extra, en qué líneas se ofrece dentro del armado del vaso */
  extraScope?: Line[]
  /** foto subida desde el formulario (data URL JPEG cuadrado); si falta se usa la del menú */
  photo?: string
}

export interface SaleItem {
  productId: string
  name: string
  qty: number
  /** precio unitario cobrado (base + toppings adicionales) */
  price: number
  /** costo de insumos al momento de la venta */
  cost: number
  /** nombres de los toppings elegidos */
  toppings?: string[]
  /** nombres de los extras agregados al vaso */
  extras?: string[]
}

export interface Sale {
  id: string
  ts: number
  items: SaleItem[]
  total: number
  cost: number
  payment: Payment
  sessionId?: string
  /** quién atendió la venta */
  employeeName?: string
}

/** personal que atiende; el PIN firma ventas y cortes */
export interface Employee {
  id: string
  name: string
  pin: string
  active: boolean
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

/** salida de dinero: gasto operativo o retiro de efectivo (a banco/caja fuerte) */
export type ExpenseKind = 'gasto' | 'retiro'

export interface Expense {
  id: string
  ts: number
  concept: string
  amount: number
  sessionId?: string
  /** ausente = gasto (compatibilidad con registros previos) */
  kind?: ExpenseKind
}

export interface CashSession {
  id: string
  openTs: number
  closeTs?: number
  openAmount: number
  /** efectivo contado al cierre */
  closeAmount?: number
  /** efectivo esperado al cierre (fondo + ventas efectivo − gastos − retiros) */
  expected?: number
  /** quién abrió el turno */
  employeeName?: string
  /** justificación cuando el contado no cuadró con lo esperado */
  note?: string
}

/** gasto de inversión/apertura del negocio (no es gasto operativo de caja) */
export interface Investment {
  id: string
  ts: number
  concept: string
  amount: number
  /** iniciales de quien pagó, p. ej. "TA" = Tania y Angel */
  paidBy: string
  /** cuánto resta por pagar de este gasto */
  pending: number
}

/** tablas del dominio que se sincronizan con la nube */
export type SyncTable =
  | 'ingredients' | 'products' | 'sales' | 'purchases' | 'wastes' | 'expenses' | 'cashSessions' | 'employees' | 'investments'
  | 'toppingLists'

export const DOMAIN_TABLES: SyncTable[] = [
  'ingredients', 'products', 'sales', 'purchases', 'wastes', 'expenses', 'cashSessions', 'employees', 'investments', 'toppingLists',
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
