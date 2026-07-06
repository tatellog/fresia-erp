import type { Ingredient, Product } from '../../data/types'
import { productCost } from '../../services/costing'
import { money } from '../../lib/format'
import { Card } from '../../components/ui'

/** renglón de producto con costo, margen y ganancia */
export function ProductRow({ product, ingredients, onEdit }: {
  product: Product
  ingredients: Map<string, Ingredient>
  onEdit: () => void
}) {
  const cost = productCost(product, ingredients)
  const margin = product.price > 0 ? ((product.price - cost) / product.price) * 100 : 0
  return (
    <Card onClick={onEdit} className={`cursor-pointer ${product.active ? '' : 'opacity-45'}`}>
      <div className="flex items-center gap-3">
        <span className="text-2xl">{product.emoji}</span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{product.name}</div>
          <div className="text-xs text-berry-700/60">
            Costo {money(cost)} · Margen {margin.toFixed(0)}%{!product.active && ' · pausado'}
          </div>
        </div>
        <div className="text-right">
          <div className="font-bold text-berry-500">{money(product.price)}</div>
          <div className="text-xs font-medium text-green-700">+{money(product.price - cost)}</div>
        </div>
      </div>
    </Card>
  )
}
