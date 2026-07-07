import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'
import { catalogOutdated, updateCatalog } from '../../data/init'
import { Button, Card } from '../../components/ui'

/**
 * Aparece cuando el dispositivo tiene un catálogo de una versión anterior
 * y ya registró ventas (por lo que no se actualiza solo). Actualizar
 * conserva ventas, cortes, compras y personal.
 */
export function CatalogUpdateCard() {
  const sales = useLiveQuery(() => db.sales.count())
  const [outdated, setOutdated] = useState(false)
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => { catalogOutdated().then(setOutdated) }, [])

  if (!outdated || !sales || done) return null

  const run = async () => {
    if (!confirm('Se reemplazará el menú y los insumos por la versión vigente. Tus ventas, cortes, compras y personal se conservan; los stocks vuelven a 0 y se cargan con compras. ¿Actualizar?')) return
    setBusy(true)
    await updateCatalog()
    setBusy(false)
    setDone(true)
  }

  return (
    <Card className="mb-3 border-berry-300">
      <h2 className="mb-1 font-bold">Menú nuevo disponible</h2>
      <p className="mb-3 text-sm text-berry-700/70">
        Este dispositivo tiene un menú de una versión anterior. Actualízalo para tener las líneas, precios y
        toppings vigentes. Tu historial de ventas y cortes no se toca.
      </p>
      <Button disabled={busy} onClick={run}>{busy ? 'Actualizando…' : 'Actualizar menú'}</Button>
    </Card>
  )
}
