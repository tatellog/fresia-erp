import Dexie, { type EntityTable } from 'dexie'

// ── Tipos ────────────────────────────────────────────────────────────

export type Unit = 'g' | 'ml' | 'pza'
export type Payment = 'efectivo' | 'tarjeta' | 'transferencia'

export interface Ingredient {
  id: number
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
  ingredientId: number
  qty: number
}

export interface Product {
  id: number
  name: string
  emoji: string
  price: number
  /** insumos que consume una unidad vendida */
  recipe: RecipeItem[]
  active: boolean
  sort: number
}

export interface SaleItem {
  productId: number
  name: string
  qty: number
  price: number
  /** costo de insumos al momento de la venta */
  cost: number
}

export interface Sale {
  id: number
  ts: number
  items: SaleItem[]
  total: number
  cost: number
  payment: Payment
  sessionId?: number
}

export interface Purchase {
  id: number
  ts: number
  ingredientId: number
  ingredientName: string
  qty: number
  totalCost: number
  note?: string
}

export interface Waste {
  id: number
  ts: number
  ingredientId: number
  ingredientName: string
  qty: number
  reason: string
}

export interface Expense {
  id: number
  ts: number
  concept: string
  amount: number
  sessionId?: number
}

export interface CashSession {
  id: number
  openTs: number
  closeTs?: number
  openAmount: number
  /** efectivo contado al cierre */
  closeAmount?: number
  /** efectivo esperado al cierre (fondo + ventas efectivo − gastos) */
  expected?: number
}

// ── Base de datos ────────────────────────────────────────────────────

export const db = new Dexie('fresia') as Dexie & {
  ingredients: EntityTable<Ingredient, 'id'>
  products: EntityTable<Product, 'id'>
  sales: EntityTable<Sale, 'id'>
  purchases: EntityTable<Purchase, 'id'>
  wastes: EntityTable<Waste, 'id'>
  expenses: EntityTable<Expense, 'id'>
  cashSessions: EntityTable<CashSession, 'id'>
}

db.version(1).stores({
  ingredients: '++id, name',
  products: '++id, name, sort',
  sales: '++id, ts, sessionId',
  purchases: '++id, ts, ingredientId',
  wastes: '++id, ts, ingredientId',
  expenses: '++id, ts, sessionId',
  cashSessions: '++id, openTs',
})

// ── Datos iniciales (solo la primera vez) ───────────────────────────

db.on('populate', () => {
  const ing = (name: string, unit: Unit, cost: number, minStock: number): Omit<Ingredient, 'id'> =>
    ({ name, unit, stock: 0, cost, minStock })

  db.ingredients.bulkAdd([
    ing('Fresa', 'g', 0.09, 3000),          // 1
    ing('Crema base', 'ml', 0.06, 2000),    // 2
    ing('Lechera', 'ml', 0.05, 1000),       // 3
    ing('Vaso chico', 'pza', 3.5, 30),      // 4
    ing('Vaso mediano', 'pza', 4.5, 30),    // 5
    ing('Vaso grande', 'pza', 5.5, 30),     // 6
    ing('Cuchara', 'pza', 0.5, 50),         // 7
    ing('Bombón', 'pza', 1.2, 40),          // 8
    ing('Chocolate líquido', 'ml', 0.12, 500), // 9
  ] as Ingredient[])

  const prod = (name: string, emoji: string, price: number, recipe: RecipeItem[], sort: number): Omit<Product, 'id'> =>
    ({ name, emoji, price, recipe, active: true, sort })

  db.products.bulkAdd([
    prod('Fresas con crema — Chica', '🍓', 75, [
      { ingredientId: 1, qty: 150 }, { ingredientId: 2, qty: 100 }, { ingredientId: 3, qty: 30 },
      { ingredientId: 4, qty: 1 }, { ingredientId: 7, qty: 1 },
    ], 1),
    prod('Fresas con crema — Mediana', '🍓', 95, [
      { ingredientId: 1, qty: 220 }, { ingredientId: 2, qty: 150 }, { ingredientId: 3, qty: 45 },
      { ingredientId: 5, qty: 1 }, { ingredientId: 7, qty: 1 },
    ], 2),
    prod('Fresas con crema — Grande', '🍓', 120, [
      { ingredientId: 1, qty: 300 }, { ingredientId: 2, qty: 200 }, { ingredientId: 3, qty: 60 },
      { ingredientId: 6, qty: 1 }, { ingredientId: 7, qty: 1 },
    ], 3),
    prod('Extra bombones', '🍡', 15, [{ ingredientId: 8, qty: 4 }], 4),
    prod('Extra chocolate', '🍫', 12, [{ ingredientId: 9, qty: 40 }], 5),
  ] as Product[])
})
