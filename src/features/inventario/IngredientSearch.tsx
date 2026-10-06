import { useState } from 'react'
import type { Ingredient } from '../../data/types'
import { strip } from '../../services/photos'

/**
 * Elegir un insumo escribiendo: "fre" ya muestra Fresa fresca. Sin texto
 * aparecen primero los que más se compran. Elegido, se ve como un botón
 * con el nombre; tocarlo deja cambiarlo.
 */
export function IngredientSearch({ ingredients, value, times, onChange, autoFocus }: {
  ingredients: Ingredient[]
  value: string
  /** veces que se ha comprado cada insumo, para ordenar */
  times: Map<string, number>
  onChange: (id: string) => void
  autoFocus?: boolean
}) {
  const elegido = ingredients.find(i => i.id === value)
  const [abierto, setAbierto] = useState(!elegido)
  const [q, setQ] = useState('')

  if (elegido && !abierto) {
    return (
      <button
        type="button"
        onClick={() => { setAbierto(true); setQ('') }}
        className="min-w-0 flex-1 truncate rounded-xl border border-cream-300 bg-cream-50 px-3 py-2.5 text-left text-base font-medium"
      >
        {elegido.name}
      </button>
    )
  }

  const texto = strip(q.trim())
  const lista = (texto
    ? ingredients.filter(i => strip(i.name).includes(texto)).sort((a, b) => Number(!strip(a.name).startsWith(texto)) - Number(!strip(b.name).startsWith(texto)))
    : [...ingredients].sort((a, b) => (times.get(b.id) ?? 0) - (times.get(a.id) ?? 0) || a.name.localeCompare(b.name))
  ).slice(0, 6)

  return (
    <div className="min-w-0 flex-1">
      <input
        value={q}
        onChange={e => setQ(e.target.value)}
        autoFocus={autoFocus}
        placeholder="Escribe el insumo… fresa, crema, vaso"
        className="w-full rounded-xl border border-cream-300 bg-cream-50 px-3 py-2.5 text-base outline-none focus:border-berry-400"
      />
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {lista.map(i => (
          <button
            key={i.id}
            type="button"
            onClick={() => { onChange(i.id); setAbierto(false) }}
            className={`rounded-full border px-3 py-1.5 text-[13px] transition-colors ${
              i.id === value ? 'border-berry-500 bg-berry-500 text-white' : 'border-cream-300 text-berry-700 active:bg-cream-200'
            }`}
          >
            {i.name}
          </button>
        ))}
        {lista.length === 0 && <span className="py-1 text-xs text-berry-700/55">Sin resultados. Créalo en Ver todo el inventario.</span>}
      </div>
    </div>
  )
}
