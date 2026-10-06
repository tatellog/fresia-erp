/** opciones de un toque para no escribir lo de siempre; la elegida se resalta */
export function QuickChips({ options, value, onPick }: {
  options: string[]
  value?: string
  onPick: (v: string) => void
}) {
  if (options.length === 0) return null
  return (
    <div className="mb-2 flex flex-wrap gap-1.5">
      {options.map(o => {
        const on = value?.trim().toLowerCase() === o.toLowerCase()
        return (
          <button
            key={o}
            type="button"
            onClick={() => onPick(o)}
            className={`rounded-full border px-3 py-1.5 text-[13px] transition-colors ${
              on ? 'border-berry-500 bg-berry-500 text-white' : 'border-cream-300 text-berry-700 active:bg-cream-200'
            }`}
          >
            {o}
          </button>
        )
      })}
    </div>
  )
}
