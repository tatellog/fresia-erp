import { useState } from 'react'
import { openCash } from '../../services/cash'
import { Button, Field, Input, Sheet } from '../../components/ui'

/** apertura de caja con fondo inicial */
export function AbrirSheet({ onClose }: { onClose: () => void }) {
  const [amount, setAmount] = useState('')
  const a = parseFloat(amount)
  return (
    <Sheet open onClose={onClose} title="Abrir caja">
      <Field label="Fondo inicial en efectivo ($)">
        <Input type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} autoFocus />
      </Field>
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
