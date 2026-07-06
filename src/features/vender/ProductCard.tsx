import type { Product } from '../../data/types'
import { money } from '../../lib/format'

/** tarjeta de producto en la cuadrícula del punto de venta */
export function ProductCard({ product, qty, onTap }: { product: Product; qty: number; onTap: () => void }) {
  return (
    <button
      onClick={onTap}
      className={`rounded-2xl p-4 text-left shadow-[0_1px_3px_rgba(174,48,40,0.08)] transition-transform active:scale-95 ${
        qty > 0 ? 'bg-berry-500 text-white' : 'bg-white'
      }`}
    >
      <div className="mb-1 flex items-start justify-between">
        <span className="text-2xl">{product.emoji}</span>
        {qty > 0 && <span className="rounded-full bg-white/25 px-2 py-0.5 text-sm font-bold">×{qty}</span>}
      </div>
      <div className="text-sm font-semibold leading-tight">{product.name}</div>
      <div className={`mt-1 font-bold ${qty > 0 ? 'text-white/90' : 'text-berry-500'}`}>{money(product.price)}</div>
    </button>
  )
}
