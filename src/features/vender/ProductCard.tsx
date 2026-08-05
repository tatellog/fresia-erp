import type { Product } from '../../data/types'
import { productLine } from '../../services/catalog'
import { productPhoto, toppingPhoto } from '../../services/photos'
import { money } from '../../lib/format'
import { CupIcon, SparkleIcon } from '../../components/ui/icons'

/** descompone el nombre en etiqueta de línea, título grande y subtítulo */
export function parts(p: Product): { eyebrow: string | null; main: string; sub: string | null } {
  const i = p.name.indexOf('·')
  const eyebrow = i >= 0 ? p.name.slice(0, i).trim() : productLine(p) ?? null
  const rest = i >= 0 ? p.name.slice(i + 1).trim() : p.name
  const size = rest.match(/^(.+?)\s+(\d+\s*(?:oz|ml))$/)
  if (size) return { eyebrow, main: size[1], sub: size[2] }
  const paren = rest.match(/^(.+?)\s*\((.+)\)$/)
  if (paren) return { eyebrow, main: paren[1], sub: paren[2] }
  return { eyebrow, main: rest, sub: null }
}

const accents: Record<string, { chip: string; bar: string; cup: string }> = {
  clasica: { chip: 'bg-berry-50 text-berry-500', bar: 'var(--color-berry-500)', cup: 'text-berry-400' },
  chocolate: { chip: 'bg-[var(--chip-choco-bg)] text-[var(--chip-choco-fg)]', bar: 'var(--line-choco)', cup: 'text-[var(--chip-choco-fg)]' },
  balance: { chip: 'bg-[var(--chip-leaf-bg)] text-[var(--chip-leaf-fg)]', bar: 'var(--line-olive)', cup: 'text-[var(--chip-leaf-fg)]' },
  brulee: { chip: 'bg-[var(--chip-brulee-bg)] text-[var(--chip-brulee-fg)]', bar: 'var(--line-brulee)', cup: 'text-[var(--chip-brulee-fg)]' },
}

/** el vaso se dibuja a escala del tamaño (nombres viejos por si el catálogo aún no se actualiza) */
const cupSizes: Record<string, string> = {
  Chico: 'h-9 w-9',
  Mediano: 'h-11 w-11',
  Grande: 'h-14 w-14',
  Mini: 'h-7 w-7',
  Chica: 'h-9 w-9',
  Mediana: 'h-11 w-11',
}

/** tarjeta de producto del punto de venta: la foto real llena toda la tarjeta */
export function ProductCard({ product, qty, onTap }: { product: Product; qty: number; onTap: () => void }) {
  const { eyebrow, main, sub } = parts(product)
  const selected = qty > 0
  const line = productLine(product) ?? 'clasica'
  const accent = accents[line]
  const popular = !!product.toppingGroup && /Median[oa]/.test(product.name)
  const photo = productPhoto(product) ?? toppingPhoto(product.name)

  if (!photo) {
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
          </div>
          <div className={`mt-2 font-display text-[22px] font-bold ${selected ? 'text-white' : 'text-berry-500'}`}>
            {money(product.price)}
          </div>
        </div>
      </button>
    )
  }

  return (
    <button
      onClick={onTap}
      className={`relative flex min-h-[13rem] flex-col overflow-hidden rounded-3xl border text-left transition-all active:scale-[0.97] ${
        selected
          ? 'border-berry-500 shadow-lg ring-2 ring-berry-500'
          : 'border-black/10 shadow-[0_2px_10px_rgba(0,0,0,0.15)] hover:shadow-[0_6px_18px_rgba(217,58,50,0.22)]'
      }`}
    >
      <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover" />
      {/* degradado para que el texto lea sobre la foto */}
      <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-black/5" />
      {selected && <span aria-hidden className="absolute inset-0 bg-berry-500/40" />}

      <div className="relative flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          {eyebrow ? (
            <span className="flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: accent.bar }} />
              {eyebrow}
            </span>
          ) : <span />}
          {selected && (
            <span className="rounded-full bg-white px-3 py-1 text-base font-bold tabular-nums text-berry-500 shadow">×{qty}</span>
          )}
        </div>

        <div className="mt-auto pt-8 text-white">
          <div className="font-display text-[27px] font-semibold leading-none drop-shadow-[0_1px_4px_rgba(0,0,0,0.55)]">{main}</div>
          <div className="mt-1.5 flex items-center gap-2 text-[13px] font-medium tracking-wide text-white/80">
            {sub && <span>{sub}</span>}
            {popular && (
              <span className="whitespace-nowrap rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] text-amber-300 backdrop-blur-sm">
                ★ más pedida
              </span>
            )}
          </div>
          <div className="mt-2 font-display text-[22px] font-bold drop-shadow-[0_1px_4px_rgba(0,0,0,0.55)]">
            {money(product.price)}
          </div>
        </div>
      </div>
    </button>
  )
}
