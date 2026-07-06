import { useState } from 'react'
import { db } from '../db'
import { exportBackup, importBackup } from '../lib/logic'
import { Button, Card } from '../components/ui'

export default function Ajustes() {
  const [msg, setMsg] = useState('')

  const download = async () => {
    const json = await exportBackup()
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `fresia-respaldo-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMsg('✓ Respaldo descargado')
  }

  const upload = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      if (!confirm('Esto reemplaza TODOS los datos actuales con los del respaldo. ¿Continuar?')) return
      try {
        await importBackup(await file.text())
        setMsg('✓ Respaldo restaurado')
      } catch {
        setMsg('✗ El archivo no es un respaldo válido')
      }
    }
    input.click()
  }

  const wipe = async () => {
    if (!confirm('¿Borrar TODOS los datos de Fresia en este dispositivo? Esta acción no se puede deshacer.')) return
    if (!confirm('Última confirmación: se borrarán ventas, inventario, productos y cortes.')) return
    await db.delete()
    location.reload()
  }

  return (
    <div className="mx-auto max-w-2xl pt-2 lg:pt-0">
      <h1 className="mb-3 text-lg font-bold">Ajustes</h1>

      <Card className="mb-3">
        <h2 className="mb-1 font-bold">Respaldo de datos</h2>
        <p className="mb-3 text-sm text-berry-700/70">
          Todos los datos viven en este dispositivo (por eso la app funciona sin internet).
          Descarga un respaldo seguido — por ejemplo, cada corte de caja — y guárdalo en tu nube o mándatelo por WhatsApp.
        </p>
        <div className="flex gap-2">
          <Button className="flex-1" onClick={download}>Descargar respaldo</Button>
          <Button variant="soft" className="flex-1" onClick={upload}>Restaurar respaldo</Button>
        </div>
        {msg && <p className="mt-2 text-sm font-semibold">{msg}</p>}
      </Card>

      <Card className="mb-3">
        <h2 className="mb-1 font-bold">Instalar como app</h2>
        <p className="text-sm text-berry-700/70">
          En iPhone: abre en Safari → botón compartir → «Agregar a inicio». En Android: Chrome te ofrecerá «Instalar app».
          Una vez instalada, abre y funciona igual con o sin internet.
        </p>
      </Card>

      <Card>
        <h2 className="mb-1 font-bold text-red-700">Zona de peligro</h2>
        <p className="mb-3 text-sm text-berry-700/70">Borra todo y empieza de cero.</p>
        <Button variant="danger" onClick={wipe}>Borrar todos los datos</Button>
      </Card>

      <p className="mt-6 text-center text-xs text-berry-700/40">Fresia ERP v0.1 · hecho con 🍓</p>
    </div>
  )
}
