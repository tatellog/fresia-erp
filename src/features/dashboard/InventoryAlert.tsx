import type { StockStatus } from '../../services/analytics'
import { StockCard } from './StockCard'

/** inventario crítico: los insumos más cerca de agotarse */
export function InventoryAlert({ statuses }: { statuses: StockStatus[] }) {
  return (
    <div className="rounded-3xl border border-cream-200 bg-cream-50 p-6">
      <h2 className="mb-4 text-xl font-semibold">Inventario crítico</h2>
      {statuses.length === 0 ? (
        <p className="py-4 text-sm text-berry-700/50">
          Registra tus compras iniciales en Insumos para activar el semáforo de stock.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {statuses.map(st => <StockCard key={st.ingredient.id} status={st} />)}
        </div>
      )}
    </div>
  )
}
