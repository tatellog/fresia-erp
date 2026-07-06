import { useState } from 'react'
import { exportBackup, importBackup } from '../../services/backup'
import { Button, Card } from '../../components/ui'

/** respaldo y restauración manual en archivo JSON */
export function BackupCard() {
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

  return (
    <Card className="mb-3">
      <h2 className="mb-1 font-bold">Respaldo manual</h2>
      <p className="mb-3 text-sm text-berry-700/70">
        Además de la nube, puedes descargar una copia de todos los datos en un archivo y restaurarla donde sea.
      </p>
      <div className="flex gap-2">
        <Button className="flex-1" onClick={download}>Descargar respaldo</Button>
        <Button variant="soft" className="flex-1" onClick={upload}>Restaurar respaldo</Button>
      </div>
      {msg && <p className="mt-2 text-sm font-semibold">{msg}</p>}
    </Card>
  )
}
