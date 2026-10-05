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

export interface CostBreakdown {
  cost: number
  /** el producto no tiene receta configurada */
  noRecipe: boolean
  /** insumos de la receta que aún no tienen precio de compra (o ya no existen) */
  missing: string[]
}

/** costo del producto y qué falta para que sea confiable */
export function costBreakdown(product: Product, ingredients: Map<string, Ingredient>): CostBreakdown {
  const missing = product.recipe
    .map(r => ingredients.get(r.ingredientId))
    .filter((ing): ing is Ingredient | undefined => !ing || ing.cost <= 0)
    .map(ing => ing?.name ?? 'un insumo que ya no existe')
  return { cost: productCost(product, ingredients), noRecipe: product.recipe.length === 0, missing }
}
