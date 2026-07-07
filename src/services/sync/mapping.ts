import type { SyncTable } from '../../data/types'

const iso = (ts: unknown) => (typeof ts === 'number' ? new Date(ts).toISOString() : null)

type CloudRow = Record<string, unknown>

/** nombre de tabla y forma de fila en Postgres (snake_case) por cada tabla local */
export const toCloud: Record<SyncTable, { table: string; map: (r: CloudRow, branch: string) => CloudRow }> = {
  ingredients: {
    table: 'ingredients',
    map: (r, branch) => ({ id: r.id, name: r.name, unit: r.unit, stock: r.stock, cost: r.cost, min_stock: r.minStock, topping_groups: r.toppingGroups ?? null, portion: r.portion ?? null, branch, updated_at: new Date().toISOString() }),
  },
  products: {
    table: 'products',
    map: (r, branch) => ({ id: r.id, name: r.name, emoji: r.emoji, price: r.price, recipe: r.recipe, active: r.active, sort: r.sort, topping_group: r.toppingGroup ?? null, line: r.line ?? null, extra_scope: r.extraScope ?? null, branch, updated_at: new Date().toISOString() }),
  },
  sales: {
    table: 'sales',
    map: (r, branch) => ({ id: r.id, ts: iso(r.ts), items: r.items, total: r.total, cost: r.cost, payment: r.payment, session_id: r.sessionId ?? null, employee: r.employeeName ?? null, branch }),
  },
  employees: {
    table: 'employees',
    map: (r, branch) => ({ id: r.id, name: r.name, active: r.active, branch, updated_at: new Date().toISOString() }),
  },
  investments: {
    table: 'investments',
    map: (r, branch) => ({ id: r.id, ts: iso(r.ts), concept: r.concept, amount: r.amount, paid_by: r.paidBy || null, pending: r.pending, branch, updated_at: new Date().toISOString() }),
  },
  purchases: {
    table: 'purchases',
    map: (r, branch) => ({ id: r.id, ts: iso(r.ts), ingredient_id: r.ingredientId, ingredient_name: r.ingredientName, qty: r.qty, total_cost: r.totalCost, note: r.note ?? null, branch }),
  },
  wastes: {
    table: 'wastes',
    map: (r, branch) => ({ id: r.id, ts: iso(r.ts), ingredient_id: r.ingredientId, ingredient_name: r.ingredientName, qty: r.qty, reason: r.reason, branch }),
  },
  expenses: {
    table: 'expenses',
    map: (r, branch) => ({ id: r.id, ts: iso(r.ts), concept: r.concept, amount: r.amount, session_id: r.sessionId ?? null, kind: r.kind ?? 'gasto', branch }),
  },
  cashSessions: {
    table: 'cash_sessions',
    map: (r, branch) => ({ id: r.id, open_ts: iso(r.openTs), close_ts: iso(r.closeTs), open_amount: r.openAmount, close_amount: r.closeAmount ?? null, expected: r.expected ?? null, employee: r.employeeName ?? null, note: r.note ?? null, branch }),
  },
}
