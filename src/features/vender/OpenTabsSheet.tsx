import { useEffect, useState } from 'react'
import type { OpenTab } from '../../data/types'
import { cancelTab, tiempoAbierta } from '../../services/tabs'
import { money } from '../../lib/format'
import { Button, Input, Sheet } from '../../components/ui'

/** lista de cuentas abiertas: abrir una para agregar o cobrar, o cancelarla */
export function OpenTabsSheet({ tabs, blocked, onOpen, onClose }: {
  tabs: OpenTab[]
  /** hay un pedido sin guardar en el ticket: no se puede abrir otra cuenta encima */
  blocked: boolean
  onOpen: (tab: OpenTab) => void
  onClose: () => void
}) {
  const [now, setNow] = useState(() => Date.now())
  const [cancelando, setCancelando] = useState<string | null>(null)
  const [motivo, setMotivo] = useState('')
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])

  const ordenadas = [...tabs].sort((a, b) => a.openTs - b.openTs)

  const confirmarCancelacion = async (id: string) => {
    await cancelTab(id, motivo)
    setCancelando(null)
    setMotivo('')
  }

  return (
    <Sheet open onClose={onClose} title="Cuentas abiertas">
      {ordenadas.length === 0 && (
        <p className="py-8 text-center text-sm text-berry-700/55">No hay cuentas abiertas.</p>
      )}
      {blocked && ordenadas.length > 0 && (
        <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Hay un pedido en el ticket. Cóbralo, guárdalo como cuenta o suéltalo antes de abrir otra.
        </p>
      )}
      <div className="space-y-2.5">
        {ordenadas.map(t => {
          const count = t.lines.reduce((s, l) => s + l.qty, 0)
          return (
            <div key={t.id} className="rounded-2xl border border-cream-200 bg-cream-50 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-semibold">{t.name}</div>
                  <div className="text-xs text-berry-700/55">
                    {tiempoAbierta(t.openTs, now)} · {count} {count === 1 ? 'artículo' : 'artículos'}
                    {t.employeeName && <> · atendió {t.employeeName}</>}
                  </div>
                  <div className="mt-1 truncate text-xs text-berry-700/70">
                    {t.lines.map(l => `${l.qty}× ${l.name}`).join(', ')}
                  </div>
                </div>
                <span className="shrink-0 font-display text-xl font-bold tabular-nums">{money(t.total)}</span>
              </div>

              {cancelando === t.id ? (
                <div className="mt-3 border-t border-cream-200 pt-3">
                  <p className="mb-2 text-xs text-berry-700/70">
                    La cuenta se cierra sin cobrar. Los insumos ya se usaron: quedan registrados como merma con este motivo.
                  </p>
                  <Input value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Se fue sin pagar, pedido equivocado…" autoFocus />
                  <div className="mt-2 flex gap-2">
                    <Button variant="soft" className="flex-1 py-2.5 text-sm" onClick={() => { setCancelando(null); setMotivo('') }}>
                      No cancelar
                    </Button>
                    <Button variant="danger" className="flex-1 py-2.5 text-sm" disabled={!motivo.trim()} onClick={() => confirmarCancelacion(t.id)}>
                      Cancelar cuenta
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex items-center gap-2">
                  <Button className="flex-1 py-2.5 text-sm" disabled={blocked} onClick={() => onOpen(t)}>
                    Abrir para cobrar o agregar
                  </Button>
                  <button
                    onClick={() => setCancelando(t.id)}
                    className="rounded-full px-3 py-2.5 text-sm font-semibold text-red-600 active:opacity-60"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Sheet>
  )
}
