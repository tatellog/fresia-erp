import type { Product } from '../../data/types'
import { productLine } from '../../services/catalog'
import { money } from '../../lib/format'
import { CupIcon, SparkleIcon } from '../../components/ui/icons'

/** descompone el nombre en etiqueta de línea, título grande y subtítulo */
function parts(p: Product): { eyebrow: string | null; main: string; sub: string | null } {
  const i = p.name.indexOf('·')
  const eyebrow = i >= 0 ? p.name.slice(0, i).trim() : productLine(p) ?? null
  const rest = i >= 0 ? p.name.slice(i + 1).trim() : p.name
  const size = rest.match(/^(.+?)\s+(\d+\s*ml)$/)
  if (size) return { eyebrow, main: size[1], sub: size[2] }
  const paren = rest.match(/^(.+?)\s*\((.+)\)$/)
  if (paren) return { eyebrow, main: paren[1], sub: paren[2] }
  return { eyebrow, main: rest, sub: null }
}

const accents: Record<string, { chip: string; bar: string; cup: string }> = {
  clasica: { chip: 'bg-berry-50 text-berry-500', bar: 'var(--color-berry-500)', cup: 'text-berry-400' },
  chocolate: { chip: 'bg-[var(--chip-choco-bg)] text-[var(--chip-choco-fg)]', bar: 'var(--line-choco)', cup: 'text-[var(--chip-choco-fg)]' },
  balance: { chip: 'bg-[var(--chip-leaf-bg)] text-[var(--chip-leaf-fg)]', bar: 'var(--line-olive)', cup: 'text-[var(--chip-leaf-fg)]' },
}

/** el vaso se dibuja a escala del tamaño: Mini chico, Grande grande */
const cupSizes: Record<string, string> = {
  Mini: 'h-7 w-7',
  Chica: 'h-9 w-9',
  Mediana: 'h-11 w-11',
  Grande: 'h-14 w-14',
}

/** tarjeta de producto del punto de venta */
export function ProductCard({ product, qty, onTap }: { product: Product; qty: number; onTap: () => void }) {
  const { eyebrow, main, sub } = parts(product)
  const selected = qty > 0
  const line = productLine(product) ?? 'clasica'
  const accent = accents[line]
  const popular = !!product.toppingGroup && product.name.includes('Mediana')
  const cupClass = cupSizes[main]

  return (
    <button
      onClick={onTap}
      className={`relative flex min-h-[10.5rem] flex-col overflow-hidden rounded-3xl border p-5 pl-6 text-left transition-all active:scale-[0.97] ${
        selected
          ? 'border-berry-500 bg-berry-500 text-white shadow-lg'
          : 'border-cream-200 bg-cream-50 shadow-[0_2px_8px_rgba(217,58,50,0.05)] hover:border-berry-200'
      }`}
    >
      {/* acento de línea */}
      {!selected && (
        <span className="absolute inset-y-5 left-0 w-1 rounded-r-full" style={{ background: accent.bar }} />
      )}

      <div className="flex items-start justify-between gap-2">
        {eyebrow ? (
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${
            selected ? 'bg-white/20 text-white' : accent.chip
          }`}>
            {eyebrow}
          </span>
        ) : <span />}
        {selected ? (
          <span className="rounded-full bg-white/25 px-3 py-1 text-base font-bold tabular-nums">×{qty}</span>
        ) : cupClass ? (
          <CupIcon className={`${cupClass} ${accent.cup} opacity-70`} strokeWidth={1.3} />
        ) : (
          <SparkleIcon className={`h-6 w-6 ${accent.cup} opacity-50`} />
        )}
      </div>

      <div className="mt-auto pt-4">
        <div className="font-display text-[27px] font-semibold leading-none">{main}</div>
        <div className={`mt-1.5 flex items-center gap-2 text-[13px] font-medium tracking-wide ${selected ? 'text-white/70' : 'text-berry-900/45'}`}>
          {sub && <span>{sub}</span>}
          {popular && !selected && (
            <span className="whitespace-nowrap rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-amber-700">
              ★ más pedida
            </span>
          )}
        </div>
        <div className={`mt-2 font-display text-[22px] font-bold ${selected ? 'text-white' : 'text-berry-500'}`}>
          {money(product.price)}
        </div>
      </div>
    </button>
  )
}
