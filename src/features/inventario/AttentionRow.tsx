import type { Ingredient } from '../../data/types'
import { consumableLevel, daysLeft, fmtDays, ingredientKind, LEVEL_LABEL } from '../../services/stock'
import { fmtQty } from '../../services/units'

export interface Attention {
  ing: Ingredient
  label: string
  detail: string
  tone: 'red' | 'amber'
  /** para ordenar: menor = más urgente */
  rank: number
}

/**
 * Insumos que necesitan atención: negativos (ventas sin compras), los que
 * se acaban en 2 días o menos al ritmo de venta, y los que están en su
 * mínimo. Un insumo en cero que nunca se ha comprado no es alerta, es un
 * dato que falta. Los consumibles solo avisan cuando hay poco o nada.
 */
export function needsAttention(ingredients: Ingredient[], usage: Map<string, number>): Attention[] {
  const out: Attention[] = []
  for (const ing of ingredients) {
    const sinDatos = ing.stock === 0 && ing.cost === 0
    if (ingredientKind(ing) === 'consumible') {
      const nivel = consumableLevel(ing)
      if (nivel !== 'ok' && !sinDatos) {
        out.push({ ing, label: LEVEL_LABEL[nivel], detail: 'Consumible: márcalo en el conteo rápido o repónlo', tone: nivel === 'agotado' ? 'red' : 'amber', rank: 50 })
      }
      continue
    }
    const dl = daysLeft(ing, usage)
    const bajo = ing.minStock > 0 && ing.stock <= ing.minStock && !sinDatos
    if (ing.stock < 0) {
      out.push({ ing, label: 'Sin compras registradas', detail: `El sistema calcula ${fmtQty(ing.stock, ing.unit)}: registra la compra o cuéntalo`, tone: 'red', rank: 0 })
    } else if (ing.stock === 0 && !sinDatos) {
      out.push({ ing, label: 'Agotado', detail: `mínimo ${fmtQty(ing.minStock, ing.unit)}`, tone: 'red', rank: 1 })
    } else if ((dl !== undefined && dl <= 2) || bajo) {
      out.push({
        ing,
        label: dl !== undefined ? `Quedan ${fmtDays(dl)}` : 'Stock bajo',
        detail: `hay ${fmtQty(ing.stock, ing.unit)}${bajo ? ` · mínimo ${fmtQty(ing.minStock, ing.unit)}` : ''}`,
        tone: dl !== undefined && dl <= 1 ? 'red' : 'amber',
        rank: 2 + (dl ?? 3),
      })
    }
  }
  return out.sort((a, b) => a.rank - b.rank || a.ing.name.localeCompare(b.ing.name))
}

const TONOS = { red: 'bg-red-50 text-red-700', amber: 'bg-amber-50 text-amber-700' }

/** renglón de "Necesitan atención": nombre, qué pasa y acceso directo a comprarlo */
export function AttentionRow({ item, first, onCompra }: { item: Attention; first: boolean; onCompra: () => void }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-3 ${first ? '' : 'border-t border-cream-200/70'}`}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate font-medium">{item.ing.name}</span>
          <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] ${TONOS[item.tone]}`}>{item.label}</span>
        </div>
        <div className="mt-0.5 text-xs text-berry-700/60">{item.detail}</div>
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
