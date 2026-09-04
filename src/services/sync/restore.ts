import { db } from '../../data/db'
import { DOMAIN_TABLES, type SyncTable } from '../../data/types'
import { SEED_VERSION } from '../../data/init'
import { supabase } from './client'
import { toCloud } from './mapping'
import { getBranch } from './settings'

type CloudRow = Record<string, unknown>

const ts = (v: unknown) => (typeof v === 'string' ? new Date(v).getTime() : undefined)

/** forma local (camelCase) de cada fila que llega de Postgres; inverso de `toCloud` */
export const fromCloud: Record<SyncTable, (r: CloudRow) => Record<string, unknown>> = {
  ingredients: r => ({ id: r.id, name: r.name, unit: r.unit, stock: r.stock, cost: r.cost, minStock: r.min_stock, toppingGroups: r.topping_groups ?? undefined, portion: r.portion ?? undefined, premiumPrice: r.premium_price ?? undefined }),
  products: r => ({ id: r.id, name: r.name, emoji: r.emoji, price: r.price, recipe: r.recipe, active: r.active, sort: r.sort, toppingGroup: r.topping_group ?? undefined, includedToppings: r.included_toppings ?? undefined, freePremium: r.free_premium ?? undefined, line: r.line ?? undefined, extraScope: r.extra_scope ?? undefined }),
  sales: r => ({ id: r.id, ts: ts(r.ts), items: r.items, total: r.total, cost: r.cost, payment: r.payment, sessionId: r.session_id ?? undefined, employeeName: r.employee ?? undefined }),
  employees: r => ({ id: r.id, name: r.name, active: r.active, pin: '' }),
  investments: r => ({ id: r.id, ts: ts(r.ts), concept: r.concept, amount: r.amount, paidBy: r.paid_by ?? '', pending: r.pending }),
  purchases: r => ({ id: r.id, ts: ts(r.ts), ingredientId: r.ingredient_id, ingredientName: r.ingredient_name, qty: r.qty, totalCost: r.total_cost, note: r.note ?? undefined }),
  wastes: r => ({ id: r.id, ts: ts(r.ts), ingredientId: r.ingredient_id, ingredientName: r.ingredient_name, qty: r.qty, reason: r.reason }),
  expenses: r => ({ id: r.id, ts: ts(r.ts), concept: r.concept, amount: r.amount, sessionId: r.session_id ?? undefined, kind: r.kind ?? 'gasto' }),
  cashSessions: r => ({ id: r.id, openTs: ts(r.open_ts), closeTs: ts(r.close_ts), openAmount: r.open_amount, closeAmount: r.close_amount ?? undefined, expected: r.expected ?? undefined, employeeName: r.employee ?? undefined, note: r.note ?? undefined }),
}

/**
 * Baja TODO lo de la sucursal desde Supabase y reemplaza los datos locales.
 * Para estrenar dispositivo o recuperar tras una pérdida. Descarga todo antes
 * de tocar la base: si la red falla a la mitad, lo local queda intacto.
 * Los PIN del personal nunca viajan a la nube: se conservan los locales
 * cuando el empleado ya existía en este dispositivo.
 */
export async function restoreFromCloud(): Promise<{ restored: number; error?: string }> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return { restored: 0, error: 'Inicia sesión primero' }
  const branch = await getBranch()

  const pulled = {} as Record<SyncTable, Record<string, unknown>[]>
  for (const table of DOMAIN_TABLES) {
    const rows: CloudRow[] = []
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabase
        .from(toCloud[table].table)
        .select('*')
        .eq('branch', branch)
        .range(from, from + 999)
      if (error) return { restored: 0, error: error.message }
      rows.push(...(data ?? []))
      if (!data || data.length < 1000) break
    }
    pulled[table] = rows.map(fromCloud[table])
  }

  const localPins = new Map((await db.employees.toArray()).map(e => [e.id, e.pin]))
  for (const e of pulled.employees) e.pin = localPins.get(e.id as string) ?? ''

  let restored = 0
  await db.transaction('rw', db.tables, async () => {
    for (const table of DOMAIN_TABLES) {
      await db.table(table).clear()
      await db.table(table).bulkAdd(pulled[table])
      restored += pulled[table].length
    }
    // lo local ya es copia fiel de la nube: nada pendiente de subir,
    // y el catálogo restaurado no debe reemplazarse por el sembrado
    await db.outbox.clear()
    await db.meta.put({ key: 'didFirstPush', value: '1' })
    await db.meta.put({ key: 'seedVersion', value: SEED_VERSION })
    await db.meta.put({ key: 'lastSyncAt', value: String(Date.now()) })
  })
  return { restored }
}
