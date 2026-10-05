import { useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import { snoozedIngredients } from '../../services/inventory'
import { dailyUsage, VENTANA_DIAS } from '../../services/stock'

/** insumos, consumo diario medido con las ventas recientes, conteos y lo ignorado de la lista */
export function useStock() {
  const ingredients = useLiveQuery(() => db.ingredients.orderBy('name').toArray())
  const products = useLiveQuery(() => db.products.toArray())
  const sales = useLiveQuery(() => db.sales.where('ts').aboveOrEqual(Date.now() - VENTANA_DIAS * 24 * 3600_000).toArray())
  const counts = useLiveQuery(() => db.counts.orderBy('ts').reverse().limit(500).toArray())
  const snoozed = useLiveQuery(() => snoozedIngredients())

  const usage = useMemo(
    () => (sales && products && ingredients ? dailyUsage(sales, products, ingredients) : new Map<string, number>()),
    [sales, products, ingredients],
  )

  if (!ingredients || !products || !sales || !counts || !snoozed) return null
  return { ingredients, usage, counts, snoozed }
}
