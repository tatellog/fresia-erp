import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { getOwnerPin, hideInversion, isInversionVisible, setOwnerPin, showInversion } from '../../services/privacy'
import { Button, Card, Field, Input } from '../../components/ui'

/** controla en qué dispositivos aparece la pestaña Inversión (PIN de dueña) */
export function InversionCard() {
  const ownerPin = useLiveQuery(getOwnerPin)
  const visible = useLiveQuery(isInversionVisible)
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)

  if (ownerPin === undefined || visible === undefined) return null

  const pinInput = (
    <Input
      inputMode="numeric" maxLength={4} value={pin} type="password"
      onChange={e => { setPin(e.target.value.replace(/\D/g, '')); setError(false) }}
      className="w-32 text-center text-xl tracking-[0.4em]"
    />
  )

  return (
    <Card className="mb-3">
      <h2 className="mb-1 font-bold">Sección Inversión</h2>
      <p className="mb-3 text-sm text-berry-700/70">
        La pestaña Inversión solo aparece en los dispositivos donde tú la muestres. En el equipo de la tienda déjala oculta.
      </p>

      {ownerPin === null ? (
        <>
          <Field label="Crea tu PIN de dueña (4 dígitos)">{pinInput}</Field>
          <Button
            disabled={!/^\d{4}$/.test(pin)}
            onClick={async () => { await setOwnerPin(pin); await showInversion(); setPin('') }}
          >
            Guardar y mostrar aquí
          </Button>
        </>
      ) : visible ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-emerald-700">Visible en este dispositivo</p>
          <Button variant="soft" onClick={hideInversion}>Ocultar</Button>
        </div>
      ) : (
        <>
          <Field label="PIN de dueña">{pinInput}</Field>
          {error && <p className="-mt-2 mb-2 text-sm text-red-700">PIN incorrecto</p>}
          <Button
            disabled={pin.length !== 4}
            onClick={async () => {
              if (pin === ownerPin) { await showInversion(); setPin('') }
              else setError(true)
            }}
          >
            Mostrar en este dispositivo
          </Button>
        </>
      )}
    </Card>
  )
}
