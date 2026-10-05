import { useState } from 'react'
import { Link } from 'react-router-dom'
import { snoozeIngredient } from '../services/inventory'
import { fmtDays, KIND_LABEL, LEVEL_LABEL, consumableLevel, shoppingList, type ShoppingItem } from '../services/stock'
import { fmtQty } from '../services/units'
import { Button } from '../components/ui'
import { useStock } from '../features/inventario/useStock'
import { RegistrarCompraSheet } from '../features/inventario/RegistrarCompraSheet'

type Compra = { ingredientId: string; qty?: number; unit: ShoppingItem['ing']['unit'] }[]

/**
 * Lista de compra armada sola: lo urgente y lo que se acaba en los
 * próximos días, con cuánto comprar para cubrir una semana. Desde aquí
 * se registra la compra (uno o varios a la vez) o se ignora un insumo
 * unos días.
 */
export default function ListaCompra() {
  const data = useStock()
  const [elegidos, setElegidos] = useState<Set<string>>(new Set())
  const [compra, setCompra] = useState<Compra | null>(null)

  if (!data) return null
  const lista = shoppingList(data.ingredients, data.usage, data.snoozed)
  const urgentes = lista.filter(i => i.priority === 'urgente')
  const pronto = lista.filter(i => i.priority === 'pronto')

  const toggle = (id: string) => setElegidos(s => {
    const n = new Set(s)
    if (n.has(id)) n.delete(id)
    else n.add(id)
    return n
  })
  const aCompra = (items: ShoppingItem[]): Compra => items.map(i => ({ ingredientId: i.ing.id, qty: i.suggested || undefined, unit: i.ing.unit }))

  const renglon = (item: ShoppingItem, idx: number) => {
    const { ing } = item
    const on = elegidos.has(ing.id)
    return (
      <div key={ing.id} className={`px-4 py-3.5 ${idx ? 'border-t border-cream-200/70' : ''}`}>
        <div className="flex items-start gap-3">
          <button
            type="button"
            role="checkbox"
            aria-checked={on}
            aria-label={`Agregar ${ing.name} a la compra`}
            onClick={() => toggle(ing.id)}
            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
              on ? 'border-berry-500 bg-berry-500 text-white' : 'border-cream-300'
            }`}
          >
            {on && <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 8.5l3 3 7-7" /></svg>}
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <span className="font-semibold">{ing.name}</span>
              {item.kind === 'consumible' ? (
                <span className="text-sm font-medium text-amber-700">{LEVEL_LABEL[consumableLevel(ing)]}</span>
              ) : item.daysLeft !== undefined ? (
                <span className={`text-sm font-medium ${item.priority === 'urgente' ? 'text-red-600' : 'text-amber-700'}`}>
                  Quedan {fmtDays(item.daysLeft)}
                </span>
              ) : null}
            </div>
            <div className="mt-0.5 text-xs text-berry-700/60">
              {item.kind === 'consumible'
                ? 'Consumible · reponer'
                : <>
                    {ing.stock < 0 ? 'Sin compras registradas' : <>Hay {fmtQty(ing.stock, ing.unit)}</>}
                    {item.usage !== undefined && <> · gasta {fmtQty(item.usage, ing.unit)}/día</>}
                    {' · '}{KIND_LABEL[item.kind]}
                  </>}
            </div>
            {item.suggested > 0 && (
              <div className="mt-1 text-sm">Comprar <b>{fmtQty(item.suggested, ing.unit)}</b></div>
            )}
            <div className="mt-2 flex gap-1.5">
              <button
                onClick={() => setCompra(aCompra([item]))}
                className="rounded-full border border-cream-300 px-3 py-1.5 text-xs font-medium text-berry-700 active:bg-cream-200"
              >
                Marcar como comprado
              </button>
              <button
                onClick={() => snoozeIngredient(ing.id)}
                className="rounded-full px-3 py-1.5 text-xs text-berry-700/60 active:bg-cream-200"
              >
                Ignorar 3 días
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const seccion = (titulo: string, items: ShoppingItem[], tono: string) => items.length > 0 && (
    <section className="mb-6">
      <h2 className={`mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] ${tono}`}>{titulo} · {items.length}</h2>
      <div className="overflow-hidden rounded-2xl border border-cream-200 bg-cream-50">{items.map(renglon)}</div>
    </section>
  )

  const seleccion = lista.filter(i => elegidos.has(i.ing.id))

  return (
    <div className="mx-auto max-w-2xl pb-6 pt-2 lg:pt-0">
      <Link to="/inventario" className="text-sm text-berry-700/60">← Inventario</Link>
      <h1 className="mt-1 text-lg font-bold">Lista de compra</h1>
      <p className="mb-5 text-sm text-berry-700/70">
        Se arma sola con lo que se vende. Lo sugerido alcanza para una semana.
      </p>

      {lista.length === 0 && (
        <p className="rounded-2xl border border-cream-200 bg-cream-50 px-4 py-6 text-center text-sm text-berry-700/60">
          Nada urgente por comprar.
        </p>
      )}
      {seccion('Urgente', urgentes, 'text-red-600')}
      {seccion('Próximamente', pronto, 'text-amber-700')}

      {seleccion.length > 0 && (
        <div className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 lg:bottom-6">
          <Button className="w-full shadow-lg" onClick={() => setCompra(aCompra(seleccion))}>
            Agregar a compra · {seleccion.length} {seleccion.length === 1 ? 'insumo' : 'insumos'}
          </Button>
        </div>
      )}

      {compra && (
        <RegistrarCompraSheet
          items={compra}
          onClose={() => { setCompra(null); setElegidos(new Set()) }}
        />
      )}
    </div>
  )
}
