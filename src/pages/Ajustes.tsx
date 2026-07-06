import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Session } from '@supabase/supabase-js'
import { db } from '../db'
import { exportBackup, fullResync, importBackup } from '../lib/logic'
import { cloudEnabled, flushOutbox, getBranch, setBranch, supabase } from '../lib/sync'
import { fmtDateTime } from '../lib/format'
import { Button, Card, Field, Input } from '../components/ui'

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

      <NubeCard />

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

      <Card className="mb-3">
        <h2 className="mb-1 font-bold">Instalar como app</h2>
        <p className="text-sm text-berry-700/70">
          En iPhone/iPad: abre en Safari → botón compartir → «Agregar a inicio». En Android: Chrome te ofrecerá «Instalar app».
          Una vez instalada, abre y funciona igual con o sin internet.
        </p>
      </Card>

      <Card>
        <h2 className="mb-1 font-bold text-red-700">Zona de peligro</h2>
        <p className="mb-3 text-sm text-berry-700/70">Borra todo y empieza de cero.</p>
        <Button variant="danger" onClick={wipe}>Borrar todos los datos</Button>
      </Card>

      <p className="mt-6 text-center text-xs text-berry-700/40">Fresia ERP v0.2 · hecho con 🍓</p>
    </div>
  )
}

function NubeCard() {
  const [session, setSession] = useState<Session | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [branch, setBranchInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')

  const pending = useLiveQuery(() => db.outbox.count())
  const lastSync = useLiveQuery(async () => (await db.meta.get('lastSyncAt'))?.value)

  useEffect(() => {
    if (!cloudEnabled) return
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    getBranch().then(setBranchInput)
    return () => sub.subscription.unsubscribe()
  }, [])

  if (!cloudEnabled) {
    return (
      <Card className="mb-3">
        <h2 className="mb-1 font-bold">Nube (multi-sucursal) ☁️</h2>
        <p className="text-sm text-berry-700/70">
          Falta configurar la llave del proyecto de Supabase (variable <code>VITE_SUPABASE_KEY</code> al compilar).
        </p>
      </Card>
    )
  }

  const login = async () => {
    setBusy(true)
    setStatus('')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) {
      setStatus(`✗ ${error.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos' : error.message}`)
      setBusy(false)
      return
    }
    // primer inicio de sesión en este dispositivo: sube todo lo local
    if (!(await db.meta.get('didFirstPush'))) {
      await fullResync()
      await db.meta.put({ key: 'didFirstPush', value: '1' })
    }
    const r = await flushOutbox()
    setStatus(r.error ? `✗ ${r.error}` : '✓ Conectado y sincronizado')
    setBusy(false)
  }

  const syncNow = async () => {
    setBusy(true)
    const r = await flushOutbox()
    setStatus(r.error ? `✗ ${r.error}` : `✓ Sincronizado (${r.pushed} cambios subidos)`)
    setBusy(false)
  }

  return (
    <Card className="mb-3">
      <h2 className="mb-1 font-bold">Nube (multi-sucursal) ☁️</h2>
      {!session ? (
        <>
          <p className="mb-3 text-sm text-berry-700/70">
            Inicia sesión para que ventas, inventario y cortes se respalden solos en la nube y puedas verlos desde
            cualquier lugar. La app sigue funcionando sin internet; se sincroniza cuando vuelve la señal.
          </p>
          <Field label="Correo">
            <Input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} />
          </Field>
          <Field label="Contraseña">
            <Input type="password" autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} />
          </Field>
          <Button className="w-full" disabled={busy || !email.trim() || !password} onClick={login}>
            {busy ? 'Conectando…' : 'Iniciar sesión'}
          </Button>
        </>
      ) : (
        <>
          <p className="mb-3 text-sm text-berry-700/70">
            Conectada como <b>{session.user.email}</b>
          </p>
          <Field label="Nombre de esta sucursal">
            <Input
              value={branch}
              onChange={e => setBranchInput(e.target.value)}
              onBlur={() => setBranch(branch)}
              placeholder="Principal"
            />
          </Field>
          <div className="mb-3 rounded-xl bg-cream-200 px-4 py-3 text-sm">
            {pending === 0 ? '✓ Todo sincronizado' : `${pending ?? '…'} cambios pendientes de subir`}
            {lastSync && <span className="text-berry-700/60"> · última vez: {fmtDateTime(Number(lastSync))}</span>}
          </div>
          <div className="flex gap-2">
            <Button className="flex-1" disabled={busy} onClick={syncNow}>
              {busy ? 'Sincronizando…' : 'Sincronizar ahora'}
            </Button>
            <Button variant="soft" className="flex-1" disabled={busy} onClick={() => supabase.auth.signOut()}>
              Cerrar sesión
            </Button>
          </div>
        </>
      )}
      {status && <p className="mt-2 text-sm font-semibold">{status}</p>}
    </Card>
  )
}
