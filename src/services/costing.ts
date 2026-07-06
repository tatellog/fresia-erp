import type { Ingredient, Product } from '../data/types'
import { round2 } from '../lib/format'

/** costo de insumos de una unidad del producto, con costos actuales */
export function productCost(product: Product, ingredients: Map<string, Ingredient>): number {
  return round2(
    product.recipe.reduce((sum, r) => {
      const ing = ingredients.get(r.ingredientId)
      return sum + (ing ? ing.cost * r.qty : 0)
    }, 0),
  )
}
