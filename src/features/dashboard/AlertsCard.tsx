import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import { buildAlerts, type AlertKind } from '../../services/alerts'
import { useStock } from '../inventario/useStock'

const DIA = 24 * 3600_000

const ETIQUETA: Record<AlertKind | 'caja', string> = {
  caja: 'Caja', dinero: 'Dinero', stock: 'Inventario', margen: 'Margen', diferencia: 'Conteo', conteo: 'Conteo',
}

/**
 * Alertas del negocio: primero lo de caja de hoy y luego lo que mueve
 * dinero, inventario, margen y diferencias. Si nada rebasa su umbral,
 * se dice que todo está en orden.
 */
export function AlertsCard({ caja }: { caja: string[] }) {
  const stock = useStock()
  const sales = useLiveQuery(() => db.sales.where('ts').aboveOrEqual(Date.now() - 28 * DIA).toArray())
  const purchases = useLiveQuery(() => db.purchases.where('ts').aboveOrEqual(Date.now() - 60 * DIA).toArray())

  const alertas = useMemo(
    () => (stock && sales && purchases
      ? buildAlerts({ sales, purchases, counts: stock.counts, ingredients: stock.ingredients, usage: stock.usage })
      : []),
    [stock, sales, purchases],
  )
  if (!stock || !sales || !purchases) return null

  const todas = [
    ...caja.map(text => ({ id: text, kind: 'caja' as const, text, to: '/caja', action: 'Ir a Caja' })),
    ...alertas,
  ]

  return (
    <div className="rounded-3xl border border-cream-200 bg-cream-50 p-6">
      <h2 className="mb-4 text-xl font-semibold">Alertas</h2>
      {todas.length === 0 ? (
        <p className="rounded-2xl bg-green-100 px-4 py-3 text-sm font-medium text-green-700">Todo en orden: sin alertas por ahora.</p>
      ) : (
        <div className="space-y-2">
          {todas.map(a => (
            <div key={a.id} className="flex items-start gap-3 rounded-2xl bg-cream-100/60 px-4 py-3">
              <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.1em] ${
                a.kind === 'dinero' || a.kind === 'caja' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
              }`}>
                {ETIQUETA[a.kind]}
              </span>
              <span className="min-w-0 flex-1 text-sm">{a.text}</span>
              {a.to && a.action && (
                <Link to={a.to} className="shrink-0 text-sm font-medium text-berry-600">{a.action}</Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
