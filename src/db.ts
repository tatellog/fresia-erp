import Dexie, { type EntityTable } from 'dexie'

export const uid = () => crypto.randomUUID()

// ── Tipos ────────────────────────────────────────────────────────────

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

// ── Base de datos ────────────────────────────────────────────────────

export const db = new Dexie('fresia2') as Dexie & {
  ingredients: EntityTable<Ingredient, 'id'>
  products: EntityTable<Product, 'id'>
  sales: EntityTable<Sale, 'id'>
  purchases: EntityTable<Purchase, 'id'>
  wastes: EntityTable<Waste, 'id'>
  expenses: EntityTable<Expense, 'id'>
  cashSessions: EntityTable<CashSession, 'id'>
  outbox: EntityTable<OutboxEntry, 'seq'>
  meta: EntityTable<MetaEntry, 'key'>
}

db.version(1).stores({
  ingredients: 'id, name',
  products: 'id, name, sort',
  sales: 'id, ts, sessionId',
  purchases: 'id, ts, ingredientId',
  wastes: 'id, ts, ingredientId',
  expenses: 'id, ts, sessionId',
  cashSessions: 'id, openTs',
  outbox: '++seq',
  meta: 'key',
})

export const DOMAIN_TABLES: SyncTable[] = [
  'ingredients', 'products', 'sales', 'purchases', 'wastes', 'expenses', 'cashSessions',
]

// ── Arranque: migración desde la v1 (ids numéricos) o datos iniciales ─

export async function initDb() {
  await db.open()
  if (await db.meta.get('initialized')) return
  const oldDbs = (await indexedDB.databases?.()) ?? []
  if (oldDbs.some(d => d.name === 'fresia')) await migrateFromV1()
  else if ((await db.products.count()) === 0) await seed()
  await db.meta.put({ key: 'initialized', value: '1' })
}

async function migrateFromV1() {
  const old = new Dexie('fresia')
  old.version(1).stores({
    ingredients: '++id, name',
    products: '++id, name, sort',
    sales: '++id, ts, sessionId',
    purchases: '++id, ts, ingredientId',
    wastes: '++id, ts, ingredientId',
    expenses: '++id, ts, sessionId',
    cashSessions: '++id, openTs',
  })
  await old.open()
  const [ingredients, products, sales, purchases, wastes, expenses, cashSessions] = await Promise.all([
    old.table('ingredients').toArray(), old.table('products').toArray(), old.table('sales').toArray(),
    old.table('purchases').toArray(), old.table('wastes').toArray(), old.table('expenses').toArray(),
    old.table('cashSessions').toArray(),
  ])
  old.close()

  const ingId = new Map(ingredients.map(i => [i.id as number, uid()]))
  const prodId = new Map(products.map(p => [p.id as number, uid()]))
  const sessId = new Map(cashSessions.map(s => [s.id as number, uid()]))
  const mapIng = (n: number) => ingId.get(n) ?? uid()

  await db.transaction('rw', db.tables, async () => {
    await db.ingredients.bulkAdd(ingredients.map(i => ({ ...i, id: ingId.get(i.id)! })))
    await db.products.bulkAdd(products.map(p => ({
      ...p,
      id: prodId.get(p.id)!,
      recipe: (p.recipe ?? []).map((r: { ingredientId: number; qty: number }) => ({ ingredientId: mapIng(r.ingredientId), qty: r.qty })),
    })))
    await db.sales.bulkAdd(sales.map(s => ({
      ...s,
      id: uid(),
      sessionId: s.sessionId != null ? sessId.get(s.sessionId) : undefined,
      items: (s.items ?? []).map((it: { productId: number } & Omit<SaleItem, 'productId'>) => ({ ...it, productId: prodId.get(it.productId) ?? uid() })),
    })))
    await db.purchases.bulkAdd(purchases.map(p => ({ ...p, id: uid(), ingredientId: mapIng(p.ingredientId) })))
    await db.wastes.bulkAdd(wastes.map(w => ({ ...w, id: uid(), ingredientId: mapIng(w.ingredientId) })))
    await db.expenses.bulkAdd(expenses.map(e => ({ ...e, id: uid(), sessionId: e.sessionId != null ? sessId.get(e.sessionId) : undefined })))
    await db.cashSessions.bulkAdd(cashSessions.map(s => ({ ...s, id: sessId.get(s.id)! })))
  })
  await Dexie.delete('fresia')
}

async function seed() {
  const ing = (name: string, unit: Unit, cost: number, minStock: number): Ingredient =>
    ({ id: uid(), name, unit, stock: 0, cost, minStock })

  const fresa = ing('Fresa', 'g', 0.09, 3000)
  const crema = ing('Crema base', 'ml', 0.06, 2000)
  const lechera = ing('Lechera', 'ml', 0.05, 1000)
  const vasoCh = ing('Vaso chico', 'pza', 3.5, 30)
  const vasoMd = ing('Vaso mediano', 'pza', 4.5, 30)
  const vasoGd = ing('Vaso grande', 'pza', 5.5, 30)
  const cuchara = ing('Cuchara', 'pza', 0.5, 50)
  const bombon = ing('Bombón', 'pza', 1.2, 40)
  const choco = ing('Chocolate líquido', 'ml', 0.12, 500)

  const prod = (name: string, emoji: string, price: number, recipe: RecipeItem[], sort: number): Product =>
    ({ id: uid(), name, emoji, price, recipe, active: true, sort })

  await db.transaction('rw', [db.ingredients, db.products], async () => {
    await db.ingredients.bulkAdd([fresa, crema, lechera, vasoCh, vasoMd, vasoGd, cuchara, bombon, choco])
    await db.products.bulkAdd([
      prod('Fresas con crema — Chica', '🍓', 75, [
        { ingredientId: fresa.id, qty: 150 }, { ingredientId: crema.id, qty: 100 }, { ingredientId: lechera.id, qty: 30 },
        { ingredientId: vasoCh.id, qty: 1 }, { ingredientId: cuchara.id, qty: 1 },
      ], 1),
      prod('Fresas con crema — Mediana', '🍓', 95, [
        { ingredientId: fresa.id, qty: 220 }, { ingredientId: crema.id, qty: 150 }, { ingredientId: lechera.id, qty: 45 },
        { ingredientId: vasoMd.id, qty: 1 }, { ingredientId: cuchara.id, qty: 1 },
      ], 2),
      prod('Fresas con crema — Grande', '🍓', 120, [
        { ingredientId: fresa.id, qty: 300 }, { ingredientId: crema.id, qty: 200 }, { ingredientId: lechera.id, qty: 60 },
        { ingredientId: vasoGd.id, qty: 1 }, { ingredientId: cuchara.id, qty: 1 },
      ], 3),
      prod('Extra bombones', '🍡', 15, [{ ingredientId: bombon.id, qty: 4 }], 4),
      prod('Extra chocolate', '🍫', 12, [{ ingredientId: choco.id, qty: 40 }], 5),
    ])
  })
}
