import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import { hasDemoOrActivity, loadDemoData } from '../../services/demo'
import { Button, Card } from '../../components/ui'

/** carga 14 días de operación de ejemplo para explorar el sistema con datos vivos */
export function DemoCard() {
  const salesCount = useLiveQuery(() => db.sales.count())
  const isDemo = useLiveQuery(async () => (await db.meta.get('demoData'))?.value === '1')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  if (salesCount === undefined) return null
  if (salesCount > 0 && !isDemo) return null // ya hay operación real: no ofrecer demo

  const load = async () => {
    if (!confirm('Se cargarán 14 días de ventas, compras y cortes de ejemplo para que explores el sistema. Antes de operar en serio, usa "Borrar todos los datos" para empezar limpio. ¿Continuar?')) return
    setBusy(true)
    try {
      if (await hasDemoOrActivity()) throw new Error('Ya hay ventas registradas')
      await loadDemoData()
      setMsg('Datos de demostración cargados. Explora el Dashboard.')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e))
    }
    setBusy(false)
  }

  return (
    <Card className="mb-3">
      <h2 className="mb-1 font-bold">Modo demostración</h2>
      {isDemo ? (
        <p className="text-sm text-berry-700/70">
          Estás viendo <b>datos de ejemplo</b> (14 días simulados, PINs de prueba 1111 y 2222). Cuando quieras operar
          en serio, ve a Zona de peligro, borra todo y arrancarás con el catálogo real en ceros. Estos datos no se
          suben a la nube.
        </p>
      ) : (
        <>
          <p className="mb-3 text-sm text-berry-700/70">
            Carga 14 días de operación simulada (ventas, costos, cortes, personal de prueba) para ver el Dashboard y
            los reportes funcionando antes de tu primera venta real.
          </p>
          <Button variant="soft" disabled={busy} onClick={load}>
            {busy ? 'Cargando…' : 'Cargar datos de ejemplo'}
          </Button>
        </>
      )}
      {msg && <p className="mt-2 text-sm font-semibold">{msg}</p>}
    </Card>
  )
}
