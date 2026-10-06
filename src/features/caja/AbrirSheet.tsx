import { useEffect, useState } from 'react'
import { openCash } from '../../services/cash'
import { lastClosingCash } from '../../services/suggestions'
import { money } from '../../lib/format'
import { Button, decimal, Field, NumberInput, Sheet } from '../../components/ui'

/** apertura de caja; el fondo viene lleno con el efectivo que quedó en el último corte */
export function AbrirSheet({ onClose }: { onClose: () => void }) {
  const [amount, setAmount] = useState('')
  const [ultimo, setUltimo] = useState<number>()
  useEffect(() => {
    lastClosingCash().then(v => {
      if (v === undefined) return
      setUltimo(v)
      setAmount(a => (a === '' ? String(v) : a))
    })
  }, [])
  const a = decimal(amount)
  return (
    <Sheet open onClose={onClose} title="Abrir caja">
      <Field label="Fondo inicial en efectivo ($)">
        <NumberInput value={amount} onChange={e => setAmount(e.target.value)} autoFocus />
      </Field>
      {ultimo !== undefined && (
        <p className="-mt-1 mb-3 text-xs text-berry-700/60">
          Es lo que se contó en el último corte ({money(ultimo)}). Cámbialo solo si se sacó o metió dinero desde entonces.
        </p>
      )}
      <Button
        className="w-full"
        disabled={!(a >= 0)}
        onClick={async () => {
          await openCash(a || 0)
          onClose()
        }}
      >
        Abrir caja
      </Button>
    </Sheet>
  )
}
