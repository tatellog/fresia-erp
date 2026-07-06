import type { Ingredient } from '../../data/types'
import { money, round2 } from '../../lib/format'
import { Button, Card } from '../../components/ui'

/** renglón de insumo con existencia y accesos a compra/merma */
export function IngredientRow({ ing, onEdit, onCompra, onMerma }: {
  ing: Ingredient
  onEdit: () => void
  onCompra: () => void
  onMerma: () => void
}) {
  return (
    <Card>
      <div className="flex items-center justify-between">
        <button className="min-w-0 flex-1 text-left" onClick={onEdit}>
          <div className="font-semibold">{ing.name}</div>
          <div className="text-xs text-berry-700/60">
            {money(ing.cost)} / {ing.unit} · mín. {ing.minStock} {ing.unit}
          </div>
        </button>
        <div className={`mx-3 text-right font-bold tabular-nums ${ing.stock <= ing.minStock ? 'text-amber-600' : ''}`}>
          {round2(ing.stock)} {ing.unit}
        </div>
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
