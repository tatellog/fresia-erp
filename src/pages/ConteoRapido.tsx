import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Ingredient, InventoryCount } from '../data/types'
import { applyCount } from '../services/inventory'
import {
  consumableLevel, countPriority, daysSinceLastCount, ingredientKind, KIND_LABEL, LEVEL_LABEL, stockForLevel, type Level,
} from '../services/stock'
import { bulkUnit, fmtQty } from '../services/units'
import { money } from '../lib/format'
import { Button, decimal, NumberInput } from '../components/ui'
import { useStock } from '../features/inventario/useStock'

/** cuántos insumos propone contar; el resto se agrega a mano */
const PROPUESTOS = 12

interface Captura {
  valor: string
  /** en kg o L en vez de g o ml */
  bulk: boolean
}

/**
 * Conteo rápido semanal: el sistema dice cuánto espera de cada insumo
 * importante y se escribe lo que hay. Al guardar se corrige la existencia
 * y queda la diferencia como merma o ajuste. Los consumibles solo se
 * marcan como hay, poco o nada.
 */
export default function ConteoRapido() {
  const data = useStock()
  const [extra, setExtra] = useState<string[]>([])
  const [captura, setCaptura] = useState<Record<string, Captura>>({})
  const [niveles, setNiveles] = useState<Record<string, Level>>({})
  const [guardando, setGuardando] = useState(false)
  const [resultado, setResultado] = useState<InventoryCount[] | null>(null)

  // la propuesta se calcula una vez: no debe reacomodarse mientras se cuenta
  const [propuesta, setPropuesta] = useState<string[] | null>(null)
  const ordenados = useMemo(() => (data ? countPriority(data.ingredients, data.counts) : []), [data])
  if (data && propuesta === null) setPropuesta(ordenados.slice(0, PROPUESTOS).map(i => i.id))

  if (!data || propuesta === null) return null
  const ingMap = new Map(data.ingredients.map(i => [i.id, i]))
  const aContar = [...propuesta, ...extra].map(id => ingMap.get(id)).filter(Boolean) as Ingredient[]
  const restantes = ordenados.filter(i => !propuesta.includes(i.id) && !extra.includes(i.id))
  const consumibles = data.ingredients.filter(i => ingredientKind(i) === 'consumible')
  const hace = daysSinceLastCount(data.counts)

  const cap = (ing: Ingredient): Captura => captura[ing.id] ?? { valor: '', bulk: !!bulkUnit(ing.unit) }
  const contado = (ing: Ingredient) => {
    const c = cap(ing)
    if (c.valor.trim() === '') return undefined
    return decimal(c.valor) * (c.bulk && bulkUnit(ing.unit) ? 1000 : 1)
  }

  const entradas = [
    ...aContar.flatMap(ing => {
      const n = contado(ing)
      return n === undefined ? [] : [{ ingredientId: ing.id, counted: n }]
    }),
    ...Object.entries(niveles).flatMap(([id, nivel]) => {
      const ing = ingMap.get(id)
      return ing ? [{ ingredientId: id, counted: stockForLevel(ing, nivel), approximate: true }] : []
    }),
  ]

  const guardar = async () => {
    setGuardando(true)
    try {
      setResultado(await applyCount(entradas))
      setCaptura({})
      setNiveles({})
    } finally {
      setGuardando(false)
    }
  }

  if (resultado) {
    const merma = resultado.filter(r => r.reason === 'merma')
    const perdida = merma.reduce((a, r) => a + r.diffCost, 0)
    // los consumibles se marcaron por nivel: su diferencia en piezas no dice nada
    const conDiferencia = resultado.filter(r => Math.abs(r.diff) > 0 && !(ingMap.get(r.ingredientId) && ingredientKind(ingMap.get(r.ingredientId)!) === 'consumible'))
    return (
      <div className="mx-auto max-w-2xl pt-2 lg:pt-0">
        <div className="rounded-3xl border border-cream-200 bg-cream-50 p-6">
          <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-berry-500">Conteo guardado</div>
          <div className="mt-1 font-display text-3xl font-bold">{resultado.length} {resultado.length === 1 ? 'insumo' : 'insumos'} al día</div>
          <p className="mt-2 text-sm text-berry-700/70">
            {merma.length > 0
              ? <>{merma.length === 1 ? 'Faltó 1 insumo' : `Faltaron ${merma.length} insumos`} sin explicación: <b className="text-red-600">{money(Math.abs(perdida))}</b> de merma no identificada.</>
              : 'No hubo merma no identificada.'}
          </p>
          {conDiferencia.length > 0 && (
            <div className="mt-4 overflow-hidden rounded-2xl bg-cream-100/60">
              {conDiferencia.map((r, i) => {
                const ing = ingMap.get(r.ingredientId)
                return (
                  <div key={r.id} className={`flex items-center justify-between gap-3 px-4 py-2.5 text-sm ${i ? 'border-t border-cream-200/70' : ''}`}>
                    <span className="min-w-0 truncate">{r.ingredientName}</span>
                    <span className={`shrink-0 tabular-nums ${r.reason === 'merma' ? 'text-red-600' : 'text-berry-700/70'}`}>
                      {r.diff > 0 ? '+' : ''}{ing ? fmtQty(r.diff, ing.unit) : r.diff} · {r.reason === 'merma' ? 'merma' : 'ajuste'}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
          <div className="mt-5 flex gap-2">
            <Link to="/inventario" className="flex-1 rounded-full bg-berry-500 py-3 text-center font-medium tracking-wide text-white">Listo</Link>
            <Button variant="soft" onClick={() => { setResultado(null); setPropuesta(null); setExtra([]) }}>Contar más</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl pb-6 pt-2 lg:pt-0">
      <Link to="/inventario" className="text-sm text-berry-700/60">← Inventario</Link>
      <h1 className="mt-1 text-lg font-bold">Conteo rápido</h1>
      <p className="mb-5 text-sm text-berry-700/70">
        Escribe lo que hay de verdad; lo que dejes vacío no se toca.
        {hace === undefined ? ' Es tu primer conteo.' : hace === 0 ? ' Último conteo: hoy.' : ` Último conteo: hace ${hace} ${hace === 1 ? 'día' : 'días'}.`}
      </p>

      {aContar.length === 0 && (
        <p className="mb-4 rounded-2xl border border-cream-200 bg-cream-50 px-4 py-5 text-center text-sm text-berry-700/60">
          No hay insumos con existencias para contar. Registra una compra primero.
        </p>
      )}

      <div className="space-y-2">
        {aContar.map(ing => {
          const c = cap(ing)
          const grande = bulkUnit(ing.unit)
          const n = contado(ing)
          const diff = n === undefined ? undefined : n - ing.stock
          const merma = diff !== undefined && diff < 0 && ing.stock >= 0
          return (
            <div key={ing.id} className="rounded-2xl border border-cream-200 bg-cream-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold">{ing.name}</div>
                  <div className="text-xs text-berry-700/60">
                    {KIND_LABEL[ingredientKind(ing)]} · el sistema espera <b className="text-berry-900">{fmtQty(ing.stock, ing.unit)}</b>
                  </div>
                </div>
                <div className="flex w-40 shrink-0 items-center gap-1.5">
                  <NumberInput
                    value={c.valor}
                    placeholder="Hay"
                    onChange={e => setCaptura(m => ({ ...m, [ing.id]: { ...c, valor: e.target.value } }))}
                  />
                  {grande ? (
                    <button
                      type="button"
                      onClick={() => setCaptura(m => ({ ...m, [ing.id]: { ...c, bulk: !c.bulk } }))}
                      className="shrink-0 rounded-full border border-cream-300 px-2.5 py-2 text-xs font-semibold text-berry-700"
                    >
                      {c.bulk ? grande : ing.unit}
                    </button>
                  ) : (
                    <span className="shrink-0 px-1 text-xs text-berry-700/60">pzas</span>
                  )}
                </div>
              </div>
              {diff === undefined && ing.stock > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    const enGrande = c.bulk && grande
                    const v = enGrande ? ing.stock / 1000 : ing.stock
                    setCaptura(m => ({ ...m, [ing.id]: { ...c, valor: String(Math.round(v * 100) / 100) } }))
                  }}
                  className="mt-2 rounded-full border border-cream-300 px-3 py-1.5 text-xs font-medium text-berry-700 active:bg-cream-200"
                >
                  Cuadra: hay {fmtQty(ing.stock, ing.unit)}
                </button>
              )}
              {diff !== undefined && (
                <div className={`mt-2 text-xs font-medium ${diff === 0 ? 'text-green-700' : merma ? 'text-red-600' : 'text-berry-700/70'}`}>
                  {diff === 0
                    ? 'Cuadra con el sistema'
                    : <>Diferencia {diff > 0 ? '+' : ''}{fmtQty(diff, ing.unit)}{merma && ing.cost > 0 && <> · {money(Math.abs(diff * ing.cost))}</>} · {merma ? 'merma no identificada' : 'ajuste de inventario'}</>}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {restantes.length > 0 && (
        <select
          value=""
          onChange={e => e.target.value && setExtra(x => [...x, e.target.value])}
          className="mt-2 w-full appearance-none rounded-2xl border border-dashed border-cream-300 bg-transparent px-4 py-3 text-sm text-berry-700/70 outline-none"
        >
          <option value="">+ Contar otro insumo…</option>
          {restantes.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
        </select>
      )}

      {consumibles.length > 0 && (
        <section className="mt-7">
          <h2 className="text-base font-semibold">Consumibles</h2>
          <p className="mb-2.5 text-xs text-berry-700/60">No hace falta contarlos: solo marca cómo están.</p>
          <div className="overflow-hidden rounded-2xl border border-cream-200 bg-cream-50">
            {consumibles.map((ing, i) => {
              const elegido = niveles[ing.id]
              const actual = consumableLevel(ing)
              return (
                <div key={ing.id} className={`flex flex-wrap items-center justify-between gap-2 px-4 py-3 ${i ? 'border-t border-cream-200/70' : ''}`}>
                  <div>
                    <div className="font-medium">{ing.name}</div>
                    <div className="text-xs text-berry-700/55">ahora: {LEVEL_LABEL[actual].toLowerCase()}</div>
                  </div>
                  <div className="flex gap-1.5">
                    {(['ok', 'bajo', 'agotado'] as Level[]).map(l => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setNiveles(m => {
                          const next = { ...m }
                          if (m[ing.id] === l) delete next[ing.id]
                          else next[ing.id] = l
                          return next
                        })}
                        className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                          elegido === l ? 'border-berry-500 bg-berry-500 text-white' : 'border-cream-300 text-berry-700'
                        }`}
                      >
                        {LEVEL_LABEL[l]}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      <div className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-30 mt-6 lg:bottom-6">
        <Button className="w-full shadow-lg" disabled={entradas.length === 0 || guardando} onClick={guardar}>
          {entradas.length === 0 ? 'Escribe al menos un conteo' : `Guardar conteo · ${entradas.length} ${entradas.length === 1 ? 'insumo' : 'insumos'}`}
        </Button>
      </div>
    </div>
  )
}
