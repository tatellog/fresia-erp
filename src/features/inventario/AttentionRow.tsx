import type { Ingredient } from '../../data/types'
import { fmtQty } from '../../services/units'

/**
 * Insumos en su mínimo o por debajo; primero los que ya no cuadran
 * (negativos o en cero). Un insumo en cero que nunca se ha comprado no es
 * alerta, es dato que falta: no se avisa hasta su primera compra o venta.
 */
export function needsAttention(ingredients: Ingredient[]): Ingredient[] {
  const peso = (i: Ingredient) => (i.stock <= 0 ? -1 : i.minStock > 0 ? i.stock / i.minStock : 1)
  return ingredients
    .filter(i => i.stock < 0 || (i.stock <= i.minStock && i.minStock > 0 && !(i.stock === 0 && i.cost === 0)))
    .sort((a, b) => peso(a) - peso(b) || a.name.localeCompare(b.name))
}

/** qué le pasa al insumo, dicho en corto */
function estado(ing: Ingredient): { label: string; detail: string; tone: string } {
  if (ing.stock < 0) {
    return {
      label: 'Sin compras registradas',
      detail: `El sistema calcula ${fmtQty(ing.stock, ing.unit)}: registra la compra para corregirlo`,
      tone: 'bg-red-50 text-red-700',
    }
  }
  if (ing.stock === 0) return { label: 'Agotado', detail: `mínimo ${fmtQty(ing.minStock, ing.unit)}`, tone: 'bg-red-50 text-red-700' }
  return { label: 'Stock bajo', detail: `quedan ${fmtQty(ing.stock, ing.unit)} · mínimo ${fmtQty(ing.minStock, ing.unit)}`, tone: 'bg-amber-50 text-amber-700' }
}

/** renglón de "Necesitan atención": nombre, qué pasa y acceso directo a comprarlo */
export function AttentionRow({ ing, first, onCompra }: { ing: Ingredient; first: boolean; onCompra: () => void }) {
  const e = estado(ing)
  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${first ? '' : 'border-t border-cream-200/70'}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{ing.name}</span>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] ${e.tone}`}>{e.label}</span>
        </div>
        <div className="mt-0.5 text-xs text-berry-700/60">{e.detail}</div>
      </div>
      <button
        onClick={onCompra}
        className="shrink-0 rounded-full border border-cream-300 px-3 py-1.5 text-xs font-medium text-berry-700 active:bg-cream-200"
      >
        Comprar
      </button>
    </div>
  )
}
