export type LineFilter = 'todo' | 'clasica' | 'chocolate' | 'balance' | 'extras'

const tabs: { id: LineFilter; label: string; dot?: string }[] = [
  { id: 'todo', label: 'Todo' },
  { id: 'clasica', label: 'Clásica', dot: 'var(--color-berry-500)' },
  { id: 'chocolate', label: 'Chocolate', dot: 'var(--line-choco)' },
  { id: 'balance', label: 'Balance', dot: 'var(--line-olive)' },
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
