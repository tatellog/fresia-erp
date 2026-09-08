import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { Session } from '@supabase/supabase-js'
import { db } from '../../data/db'
import { fullResync } from '../../services/outbox'
import { cloudEnabled, supabase } from '../../services/sync/client'
import { syncRound } from '../../services/sync/engine'
import { restoreFromCloud } from '../../services/sync/restore'
import { getBranch, setBranch } from '../../services/sync/settings'
import { fmtDateTime } from '../../lib/format'
import { Button, Card, Field, Input } from '../../components/ui'

/** conexión con Supabase: sesión, sucursal y estado de sincronización */
export function CloudCard() {
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
        <h2 className="mb-1 font-bold">Nube y sucursales</h2>
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
    // primer inicio de sesión en este dispositivo: sube todo lo local,
    // salvo que sea un dispositivo nuevo (sin movimientos) en una sucursal
    // que ya tiene datos en la nube; ahí lo correcto es restaurar, no subir
    // el catálogo sembrado encima.
    if (!(await db.meta.get('didFirstPush'))) {
      const hasActivity = (await db.sales.count()) + (await db.purchases.count()) > 0
      const { count } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('branch', (branch ?? '').trim() || 'Principal')
      if (!hasActivity && (count ?? 0) > 0) {
        await db.meta.put({ key: 'didFirstPush', value: '1' })
        setStatus('✓ Conectado. La sucursal ya tiene datos en la nube: usa «Restaurar desde la nube» para traerlos')
        setBusy(false)
        return
      }
      await fullResync()
      await db.meta.put({ key: 'didFirstPush', value: '1' })
    }
    const r = await syncRound()
    setStatus(r.error ? `✗ ${r.error}` : '✓ Conectado y sincronizado')
    setBusy(false)
  }

  const syncNow = async () => {
    setBusy(true)
    const r = await syncRound()
    setStatus(r.error ? `✗ ${r.error}` : `✓ Sincronizado (${r.pushed} cambios subidos, ${r.pulled} bajados)`)
    setBusy(false)
  }

  const restore = async () => {
    const name = branch.trim() || 'Principal'
    if (!confirm(`Esto reemplaza TODOS los datos de este dispositivo con lo guardado en la nube de la sucursal «${name}». ¿Continuar?`)) return
    setBusy(true)
    const r = await restoreFromCloud()
    setStatus(r.error ? `✗ ${r.error}` : `✓ Restaurado desde la nube (${r.restored} registros)`)
    setBusy(false)
  }

  return (
    <Card className="mb-3">
      <h2 className="mb-1 font-bold">Nube y sucursales</h2>
      {!session ? (
        <>
          <p className="mb-3 text-sm text-berry-700/70">
            Inicia sesión para que ventas, inventario y cortes se respalden solos en la nube y puedas verlos desde
            cualquier lugar. La app sigue funcionando sin internet; se sincroniza cuando vuelve la señal, y cada
            dispositivo baja solo lo que registran los demás.
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
          <Button variant="soft" className="mt-2 w-full" disabled={busy} onClick={restore}>
            Restaurar desde la nube
          </Button>
          <p className="mt-1 text-xs text-berry-700/50">
            Para estrenar dispositivo o recuperar datos: baja todo lo de esta sucursal y reemplaza lo local. Los PIN no viajan a la nube: los empleados
            recuperados quedan sin PIN hasta asignarles uno en «Personal».
          </p>
        </>
      )}
      {status && <p className="mt-2 text-sm font-semibold">{status}</p>}
    </Card>
  )
}
