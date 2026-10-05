import { Link } from 'react-router-dom'
import type { Attention } from '../inventario/AttentionRow'

const TONOS = { red: 'bg-red-50 text-red-700', amber: 'bg-amber-50 text-amber-700' }

/** lo que necesita atención en inventario, con la misma lógica que la pantalla de Inventario */
export function InventoryAlert({ items }: { items: Attention[] }) {
  return (
    <div className="rounded-3xl border border-cream-200 bg-cream-50 p-6">
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-xl font-semibold">Inventario</h2>
        <Link to="/inventario" className="text-sm font-medium text-berry-600">Ver inventario</Link>
      </div>
      {items.length === 0 ? (
        <p className="py-2 text-sm text-berry-700/60">Todo en orden: nada se acaba en los próximos días.</p>
      ) : (
        <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {items.slice(0, 6).map(a => (
            <div key={a.ing.id} className="rounded-2xl bg-cream-100/60 px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-medium">{a.ing.name}</span>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] ${TONOS[a.tone]}`}>{a.label}</span>
              </div>
              <div className="mt-0.5 truncate text-xs text-berry-700/60">{a.detail}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
