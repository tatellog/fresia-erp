import type { Product } from '../../data/types'
import { money } from '../../lib/format'

/** separa "Clásica · Mini 250 ml" en etiqueta de línea y nombre corto */
function splitName(p: Product): { eyebrow: string | null; title: string } {
  const i = p.name.indexOf('·')
  if (i < 0) return { eyebrow: p.toppingGroup ? (p.toppingGroup === 'clasica' ? 'Clásica' : 'Balance') : null, title: p.name }
  return { eyebrow: p.name.slice(0, i).trim(), title: p.name.slice(i + 1).trim() }
}

/** tarjeta de producto en la cuadrícula del punto de venta */
export function ProductCard({ product, qty, onTap }: { product: Product; qty: number; onTap: () => void }) {
  const { eyebrow, title } = splitName(product)
  const selected = qty > 0
  const balance = product.toppingGroup === 'balance'
  return (
    <button
      onClick={onTap}
      className={`relative flex min-h-[7.5rem] flex-col justify-between rounded-2xl border p-4 text-left transition-all active:scale-[0.97] ${
        selected
          ? 'border-berry-500 bg-berry-500 text-cream-50 shadow-md'
          : 'border-cream-200 bg-white shadow-[0_1px_2px_rgba(174,48,40,0.05)]'
      }`}
    >
      <div>
        {eyebrow && (
          <div className={`mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${
            selected ? 'text-cream-50/80' : balance ? 'text-leaf-600' : 'text-berry-400'
          }`}>
            {eyebrow}
          </div>
        )}
        <div className="font-display text-lg font-semibold leading-tight">{title}</div>
      </div>
      <div className="mt-2 flex items-end justify-between">
        <span className={`text-[15px] font-medium tracking-wide ${selected ? 'text-cream-50/90' : 'text-berry-500'}`}>
          {money(product.price)}
        </span>
        {selected && (
          <span className="rounded-full bg-white/25 px-2.5 py-0.5 text-sm font-semibold">×{qty}</span>
        )}
      </div>
    </button>
  )
}
