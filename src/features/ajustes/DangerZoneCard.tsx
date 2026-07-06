import { db } from '../../data/db'
import { Button, Card } from '../../components/ui'

/** borrado total de los datos locales del dispositivo */
export function DangerZoneCard() {
  const wipe = async () => {
    if (!confirm('¿Borrar TODOS los datos de Fresia en este dispositivo? Esta acción no se puede deshacer.')) return
    if (!confirm('Última confirmación: se borrarán ventas, inventario, productos y cortes.')) return
    await db.delete()
    location.reload()
  }

  return (
    <Card>
      <h2 className="mb-1 font-bold text-red-700">Zona de peligro</h2>
      <p className="mb-3 text-sm text-berry-700/70">Borra todo y empieza de cero.</p>
      <Button variant="danger" onClick={wipe}>Borrar todos los datos</Button>
    </Card>
  )
}
