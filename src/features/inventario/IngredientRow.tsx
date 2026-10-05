import type { Ingredient } from '../../data/types'
import { fmtQty, fmtUnitCost } from '../../services/units'
import { consumableLevel, fmtDays, ingredientKind, KIND_LABEL, LEVEL_LABEL } from '../../services/stock'
import { Button, Card } from '../../components/ui'

/** renglón de insumo: existencia (o nivel, si es consumible), días que alcanza y accesos a compra/merma */
export function IngredientRow({ ing, usage, onEdit, onCompra, onMerma }: {
  ing: Ingredient
  /** consumo diario medido; sin él no se muestran días */
  usage?: number
  onEdit: () => void
  onCompra: () => void
  onMerma: () => void
}) {
  const kind = ingredientKind(ing)
  const dias = usage && usage > 0 ? Math.max(0, ing.stock) / usage : undefined
  return (
    <Card>
      <div className="flex items-center justify-between">
        <button className="min-w-0 flex-1 text-left" onClick={onEdit}>
          <div className="font-semibold">{ing.name}</div>
          <div className="text-xs text-berry-700/60">
            {KIND_LABEL[kind]} · {ing.cost > 0 ? fmtUnitCost(ing.cost, ing.unit) : 'sin costo aún'}
          </div>
        </button>
        {kind === 'consumible' ? (
          <div className={`mx-3 text-right text-sm font-semibold ${consumableLevel(ing) === 'ok' ? '' : 'text-amber-600'}`}>
            {LEVEL_LABEL[consumableLevel(ing)]}
          </div>
        ) : (
          <div className="mx-3 text-right">
            <div className={`font-bold tabular-nums ${ing.stock < 0 ? 'text-red-600' : ing.stock <= ing.minStock ? 'text-amber-600' : ''}`}>
              {dias !== undefined ? fmtDays(dias) : fmtQty(ing.stock, ing.unit)}
            </div>
            {dias !== undefined && <div className="text-xs tabular-nums text-berry-700/55">{fmtQty(ing.stock, ing.unit)}</div>}
          </div>
        )}
        <div className="flex gap-1.5">
          <Button variant="soft" className="px-2.5 py-1.5 text-xs" onClick={onCompra}>
            Compra
          </Button>
          <Button variant="ghost" className="px-2.5 py-1.5 text-xs" onClick={onMerma}>
            Merma
          </Button>
        </div>
      </div>
    </Card>
  )
}
