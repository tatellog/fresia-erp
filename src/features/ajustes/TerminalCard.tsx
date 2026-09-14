import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Session } from '@supabase/supabase-js'
import { db } from '../../data/db'
import { cloudEnabled, supabase } from '../../services/sync/client'
import {
  cancelPendingPrint, clearPendingPrint, getPendingPrint, linkTerminal, listTerminals,
  printStatus, printTicket, setTerminalMode, unlinkTerminal, type MpTerminal,
} from '../../services/mp'
import { renderTicket } from '../../services/ticket'
import { Button, Card } from '../../components/ui'

/** vínculo con la terminal Mercado Pago Point Smart 2 (cobro desde el POS) */
export function TerminalCard() {
  const [session, setSession] = useState<Session | null>(null)
  const [found, setFound] = useState<MpTerminal[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  /** modo que Mercado Pago reporta hoy para la terminal vinculada */
  const [modo, setModo] = useState<MpTerminal['operating_mode'] | null>(null)

  const linked = useLiveQuery(async () => (await db.meta.get('mpTerminalId'))?.value)
  const pendiente = useLiveQuery(getPendingPrint)

  useEffect(() => {
    if (!cloudEnabled) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => sub.subscription.unsubscribe()
  }, [])

  // el modo se consulta a Mercado Pago, no se supone: la app puede haber
  // pedido PDV y la Point seguir en standalone por no haberse reiniciado
  useEffect(() => {
    if (!session || !linked) {
      setModo(null)
      return
    }
    listTerminals()
      .then(ts => setModo(ts.find(t => t.id === linked)?.operating_mode ?? null))
      .catch(() => setModo(null))
  }, [session, linked])

  const buscar = async () => {
    setBusy(true)
    setStatus('')
    try {
      const terminals = await listTerminals()
      setFound(terminals)
      if (terminals.length === 0) setStatus('✗ No hay terminales en tu cuenta de Mercado Pago')
    } catch (e) {
      setStatus(`✗ ${e instanceof Error ? e.message : e}`)
    }
    setBusy(false)
  }

  const vincular = async (t: MpTerminal) => {
    setBusy(true)
    setStatus('')
    try {
      if (t.operating_mode !== 'PDV') {
        await setTerminalMode(t.id, 'PDV')
        setStatus('✓ Terminal vinculada. Se activó el modo PDV: reiníciala para terminar')
      } else {
        setStatus('✓ Terminal vinculada y lista')
      }
      await linkTerminal(t.id)
      setFound(null)
    } catch (e) {
      setStatus(`✗ ${e instanceof Error ? e.message : e}`)
    }
    setBusy(false)
  }

  const quitar = async () => {
    await unlinkTerminal()
    setStatus('Terminal desvinculada. Para volver a cobrar sola, cámbiala a modo STANDALONE en la app de Mercado Pago.')
  }

  /** manda un ticket de muestra a la impresora para verificar el vínculo */
  const probarImpresion = async () => {
    setBusy(true)
    setStatus('')
    try {
      const content = renderTicket({
        lines: [{
          product: { id: 'prueba', name: 'Ticket de prueba', emoji: '', price: 0, recipe: [], active: true, sort: 0 },
          qty: 1, toppings: [], extras: [],
        }],
        total: 0, payment: 'efectivo', ts: Date.now(),
      })
      const actionId = await printTicket(content, `prueba-${Date.now()}`)
      setStatus('Enviado. Verificando con Mercado Pago…')
      // se consulta el estado un rato: la Point puede tardar en recogerlo
      for (let i = 0; i < 10; i++) {
        await new Promise(r => setTimeout(r, 3000))
        const s = await printStatus(actionId)
        // Mercado Pago solo reporta created / on_terminal / canceled: que la
        // terminal la haya tomado es lo más lejos que llega la confirmación
        if (s.status === 'on_terminal' || s.status === 'processed' || s.status === 'finished') {
          await clearPendingPrint()
          setStatus('✓ La terminal recibió el ticket. Si no salió papel, revisa el rollo de la impresora')
          setBusy(false)
          return
        }
        if (s.status === 'failed' || s.status === 'canceled' || s.status === 'error') {
          await clearPendingPrint()
          setStatus(`✗ La terminal no lo imprimió (${s.status}${s.detail ? `: ${s.detail}` : ''})`)
          setBusy(false)
          return
        }
        setStatus(`Esperando a que la Point lo recoja (${s.status})…`)
      }
      // «created» significa que Mercado Pago lo aceptó y la terminal nunca fue
      // a buscarlo: el problema está en el aparato, no en el ticket ni el token
      setStatus(
        modo === 'PDV'
          ? 'La Point no recogió el ticket. Déjala parada en «Cobros vinculados → Cobros automáticos»: en el menú de inicio no recoge nada. Mientras el ticket siga en la cola, la terminal tampoco acepta cobros.'
          : 'La Point está en modo normal, no en PDV: no va a recoger nada que le mande la app. Activa «Modo PDV» aquí y reinicia la terminal.',
      )
    } catch (e) {
      setStatus(`✗ ${e instanceof Error ? e.message : e}`)
    }
    setBusy(false)
  }

  return (
    <Card className="mb-3">
      <h2 className="mb-1 font-bold">Terminal Mercado Pago</h2>
      {!session ? (
        <p className="text-sm text-berry-700/70">
          Inicia sesión en «Nube y sucursales» para vincular tu Point Smart 2: los cobros con tarjeta se mandarán solos
          a la terminal y la venta se registrará al confirmarse el pago.
        </p>
      ) : (
        <>
          <p className="mb-3 text-sm text-berry-700/70">
            {linked
              ? 'Point vinculada: al cobrar con tarjeta, el monto aparece solo en la terminal y la venta se registra al confirmarse el pago. Deja la Point en «Cobros vinculados → Cobros automáticos»: en el menú de inicio no recoge los cobros.'
              : 'Vincula tu Point Smart 2 para mandarle los cobros con tarjeta desde el punto de venta.'}
          </p>
          {linked && (
            <div className="mb-3 rounded-xl bg-cream-200 px-4 py-2.5">
              <p className="break-all text-xs text-berry-700/70">{linked}</p>
              {modo && (
                <p className={`mt-1 text-xs font-bold ${modo === 'PDV' ? 'text-green-700' : 'text-berry-700'}`}>
                  {modo === 'PDV'
                    ? 'En modo PDV · recibe cobros y tickets de la app'
                    : 'En modo normal · no recibe nada de la app'}
                </p>
              )}
            </div>
          )}

          {found && found.length > 0 && (
            <div className="mb-3 space-y-2">
              {found.map(t => (
                <button
                  key={t.id}
                  disabled={busy}
                  onClick={() => vincular(t)}
                  className="flex w-full items-center justify-between rounded-xl border border-cream-300 px-4 py-3 text-left text-sm active:bg-cream-100"
                >
                  <span className="min-w-0 break-all pr-2 font-medium">{t.external_pos_id || t.id}</span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    t.operating_mode === 'PDV' ? 'bg-green-100 text-green-700' : 'bg-cream-200 text-berry-700/70'
                  }`}>
                    {t.operating_mode === 'PDV' ? 'modo PDV' : 'modo normal'}
                  </span>
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Button className="flex-1" disabled={busy} onClick={buscar}>
              {busy ? 'Buscando…' : linked ? 'Cambiar terminal' : 'Buscar terminales'}
            </Button>
            {linked && (
              <Button variant="soft" className="flex-1" disabled={busy} onClick={quitar}>
                Desvincular
              </Button>
            )}
          </div>
          {linked && (
            <Button variant="soft" className="mt-2 w-full" disabled={busy} onClick={probarImpresion}>
              Imprimir ticket de prueba
            </Button>
          )}
          {linked && pendiente && (
            <Button
              variant="soft" className="mt-2 w-full" disabled={busy}
              onClick={async () => {
                setBusy(true)
                try {
                  await cancelPendingPrint()
                  setStatus('✓ Cola liberada: la terminal vuelve a aceptar cobros y tickets')
                } catch (e) { setStatus(`✗ ${e instanceof Error ? e.message : e}`) }
                setBusy(false)
              }}
            >
              Destrabar terminal
            </Button>
          )}
          {linked && (
            <div className="mt-2 flex gap-2">
              <Button
                variant="soft" className="flex-1 text-xs" disabled={busy}
                onClick={async () => {
                  setBusy(true)
                  try {
                    await setTerminalMode(linked, 'PDV')
                    setModo('PDV')
                    setStatus('✓ Modo PDV activado: reinicia la terminal. La app le manda cobros y tickets; su teclado de cobro se bloquea.')
                  } catch (e) { setStatus(`✗ ${e instanceof Error ? e.message : e}`) }
                  setBusy(false)
                }}
              >
                Modo PDV (app manda)
              </Button>
              <Button
                variant="soft" className="flex-1 text-xs" disabled={busy}
                onClick={async () => {
                  setBusy(true)
                  try {
                    await setTerminalMode(linked, 'STANDALONE')
                    setModo('STANDALONE')
                    setStatus('✓ Modo normal activado: reinicia la terminal. Cobra sola con su teclado, pero la app ya no puede mandarle cobros ni tickets.')
                  } catch (e) { setStatus(`✗ ${e instanceof Error ? e.message : e}`) }
                  setBusy(false)
                }}
              >
                Modo normal (cobra sola)
              </Button>
            </div>
          )}
        </>
      )}
      {status && <p className="mt-2 text-sm font-semibold">{status}</p>}
    </Card>
  )
}
