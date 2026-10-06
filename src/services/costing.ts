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

/** onzas en el nombre del producto: "Clásica · Grande 20 oz" → 20 */
export const ozOf = (name: string) => {
  const m = name.match(/(\d+)\s*oz/i)
  return m ? Number(m[1]) : undefined
}

/**
 * Receta de otro tamaño ajustada al nuevo: lo que va en gramos o mililitros
 * se escala por las onzas (redondeado a 5) y el empaque que dice el tamaño
 * ("Vaso PET 16 oz") se cambia por el del tamaño nuevo si existe. Lo demás
 * (tapa, cuchara, sticker) se copia igual.
 */
export function scaleRecipe(recipe: Product['recipe'], fromOz: number | undefined, toOz: number | undefined, ingredients: Ingredient[]): Product['recipe'] {
  const ratio = fromOz && toOz ? toOz / fromOz : 1
  const porNombre = new Map(ingredients.map(i => [i.name.toLowerCase(), i]))
  const porId = new Map(ingredients.map(i => [i.id, i]))
  return recipe.map(r => {
    const ing = porId.get(r.ingredientId)
    if (!ing) return r
    if (ing.unit !== 'pza') return { ingredientId: r.ingredientId, qty: Math.max(5, Math.round((r.qty * ratio) / 5) * 5) }
    if (fromOz && toOz && ing.name.includes(`${fromOz} oz`)) {
      const otro = porNombre.get(ing.name.replace(`${fromOz} oz`, `${toOz} oz`).toLowerCase())
      if (otro) return { ingredientId: otro.id, qty: r.qty }
    }
    return r
  })
}
