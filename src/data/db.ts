import Dexie, { type EntityTable } from 'dexie'
import type {
  CashSession, Expense, Ingredient, MetaEntry, OutboxEntry, Product, Purchase, Sale, Waste,
} from './types'

/** instancia única de la base local (IndexedDB) */
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
