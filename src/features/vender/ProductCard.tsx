import type { Product } from '../../data/types'
import { money } from '../../lib/format'

/** descompone el nombre en etiqueta de línea, título grande y subtítulo */
function parts(p: Product): { eyebrow: string | null; main: string; sub: string | null } {
  const i = p.name.indexOf('·')
  const eyebrow = i >= 0 ? p.name.slice(0, i).trim() : p.line ?? null
  const rest = i >= 0 ? p.name.slice(i + 1).trim() : p.name
  const size = rest.match(/^(.+?)\s+(\d+\s*ml)$/)          // "Chica 350 ml" → Chica / 350 ml
  if (size) return { eyebrow, main: size[1], sub: size[2] }
  const paren = rest.match(/^(.+?)\s*\((.+)\)$/)           // "Combo Clásico (mediana + agua)"
  if (paren) return { eyebrow, main: paren[1], sub: paren[2] }
  return { eyebrow, main: rest, sub: null }
}

const chipStyles: Record<string, string> = {
  clasica: 'bg-berry-50 text-berry-500',
  chocolate: 'bg-[#F3E9DE] text-[#8B5E34]',
  balance: 'bg-[#F1F4E4] text-[#5F6F3A]',
}

/** tarjeta de producto del punto de venta */
export function ProductCard({ product, qty, onTap }: { product: Product; qty: number; onTap: () => void }) {
  const { eyebrow, main, sub } = parts(product)
  const selected = qty > 0
  const popular = !!product.toppingGroup && product.name.includes('Mediana')
  return (
    <button
      onClick={onTap}
      className={`relative flex min-h-[10rem] flex-col rounded-3xl border p-5 text-left transition-all active:scale-[0.97] ${
        selected
          ? 'border-berry-500 bg-berry-500 text-cream-50 shadow-lg'
          : 'border-cream-200 bg-white shadow-[0_2px_8px_rgba(174,48,40,0.06)] hover:border-berry-200'
      }`}
    >
      <div className="flex items-start justify-between gap-1">
        {eyebrow ? (
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${
            selected ? 'bg-white/20 text-cream-50' : chipStyles[product.line ?? 'clasica']
          }`}>
            {eyebrow}
          </span>
        ) : <span />}
        {selected ? (
          <span className="rounded-full bg-white/25 px-2.5 py-1 text-sm font-bold">×{qty}</span>
        ) : popular ? (
          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-amber-700">
            ★ más pedida
          </span>
        ) : null}
      </div>

      <div className="mt-auto pt-4">
        <div className="font-display text-[26px] font-semibold leading-none">{main}</div>
        {sub && (
          <div className={`mt-1 text-[13px] font-medium tracking-wide ${selected ? 'text-cream-50/70' : 'text-berry-900/45'}`}>
            {sub}
          </div>
        )}
        <div className={`mt-2 font-display text-xl font-bold ${selected ? 'text-cream-50' : 'text-berry-500'}`}>
          {money(product.price)}
        </div>
      </div>
    </button>
  )
}
