import type { Line } from '../../data/types'

export type LineFilter = 'todo' | Line | 'extras'

const tabs: { id: LineFilter; label: string; dot?: string }[] = [
  { id: 'todo', label: 'Todo' },
  { id: 'nogada', label: 'Del mes', dot: 'var(--line-nogada)' },
  { id: 'clasica', label: 'Clásica', dot: 'var(--color-berry-500)' },
  { id: 'uvas', label: 'Uvas', dot: 'var(--line-uva)' },
  { id: 'mix', label: 'Mix', dot: 'var(--line-mix)' },
  { id: 'granada', label: 'Granada', dot: 'var(--line-granada)' },
  { id: 'balance', label: 'Balance', dot: 'var(--line-olive)' },
  { id: 'chocolate', label: 'Choco Crema', dot: 'var(--line-choco)' },
  { id: 'brulee', label: 'Brûlée', dot: 'var(--line-brulee)' },
  { id: 'waffle', label: 'Waffle', dot: 'var(--line-waffle)' },
  { id: 'bebidas', label: 'Bebidas', dot: 'var(--line-te)' },
  { id: 'despensa', label: 'Despensa', dot: 'var(--line-miel)' },
  { id: 'extras', label: 'Extras', dot: 'var(--color-blush)' },
]

/** pestañas de línea del punto de venta: un toque y ves solo esa línea */
export function LineTabs({ value, onChange, available }: {
  value: LineFilter
  onChange: (v: LineFilter) => void
  available: Set<LineFilter>
}) {
  return (
    <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
      {tabs.filter(t => t.id === 'todo' || available.has(t.id)).map(t => {
        const on = value === t.id
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold tracking-wide transition-colors ${
              on ? 'border-berry-500 bg-berry-500 text-white shadow-sm' : 'border-cream-300 bg-cream-50 text-berry-900/70'
            }`}
          >
            {t.dot && <span className="h-2 w-2 rounded-full" style={{ background: on ? '#fff' : t.dot }} />}
            {t.label}
          </button>
        )
      })}
    </div>
  )
}
