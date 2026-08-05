import type { Ingredient, Product } from '../../data/types'
import { productCost } from '../../services/costing'
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
  const cost = productCost(product, ingredients)
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
          {cost > 0 ? (
            <div className="text-xs font-medium text-green-700">
              deja {money(product.price - cost)} · {margin.toFixed(0)}%
            </div>
          ) : (
            <span className="mt-0.5 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-amber-700">
              costo pendiente
            </span>
          )}
        </div>
      </div>
    </Card>
  )
}
