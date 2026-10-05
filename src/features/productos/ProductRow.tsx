import type { Ingredient, Product } from '../../data/types'
import { costBreakdown } from '../../services/costing'
import { money } from '../../lib/format'
import { Card } from '../../components/ui'
import { CupIcon } from '../../components/ui/icons'
import { parts } from '../vender/ProductCard'
import { productPhoto, toppingPhoto } from '../../services/photos'

/** renglón de producto: foto, tamaño, precio y cuánto deja cada vaso */
export function ProductRow({ product, ingredients, onEdit }: {
  product: Product
  ingredients: Map<string, Ingredient>
  onEdit: () => void
}) {
  const { cost, noRecipe, missing } = costBreakdown(product, ingredients)
  const falta = noRecipe
    ? 'Falta configurar receta'
    : missing.length > 0
      ? `Falta precio de compra: ${missing.slice(0, 2).join(', ')}${missing.length > 2 ? ` y ${missing.length - 2} más` : ''}`
      : null
  const margin = product.price > 0 ? ((product.price - cost) / product.price) * 100 : 0
  const photo = productPhoto(product) ?? toppingPhoto(product.name)
  const { main, sub } = parts(product)

  return (
    <Card onClick={onEdit} className={`cursor-pointer ${product.active ? '' : 'opacity-45'}`}>
      <div className="flex items-center gap-3.5">
        {photo ? (
          <img src={photo} alt="" className="h-14 w-14 shrink-0 rounded-2xl object-cover" />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-cream-100">
            <CupIcon className="h-7 w-7 text-berry-300" strokeWidth={1.3} />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-lg font-semibold leading-tight">{main}</div>
          <div className="text-xs text-berry-700/60">
            {sub}
            {!product.active && (sub ? ' · pausado' : 'pausado')}
          </div>
          {cost > 0 && (
            <div className="mt-1.5 h-1.5 max-w-[9rem] overflow-hidden rounded-full bg-cream-200">
              <div className="h-full rounded-full bg-green-600" style={{ width: `${Math.max(0, Math.min(100, margin))}%` }} />
            </div>
          )}
        </div>

        <div className="shrink-0 text-right">
          <div className="font-display text-xl font-bold text-berry-500">{money(product.price)}</div>
          {cost > 0 && (
            <div className="text-xs tabular-nums text-berry-700/60">
              costo {money(cost)} · <span className="font-medium text-green-700">deja {money(product.price - cost)} · {margin.toFixed(0)}%</span>
            </div>
          )}
        </div>
      </div>
      {falta && (
        <div className="mt-2.5 rounded-xl bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-700">
          {cost > 0 ? `Costo incompleto. ${falta}` : falta}
        </div>
      )}
    </Card>
  )
}
