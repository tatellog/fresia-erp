import { useState } from 'react'
import { addExpense } from '../../services/cash'
import { Button, Field, Input, Sheet } from '../../components/ui'

/** retiro de efectivo del cajón (a banco o caja fuerte) */
export function RetiroSheet({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const [motivo, setMotivo] = useState('')
  const [amount, setAmount] = useState('')
  const a = parseFloat(amount)
  return (
    <Sheet open onClose={onClose} title="Retiro de efectivo">
      <Field label="Monto ($)">
        <Input type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} autoFocus />
      </Field>
      <Field label="Motivo">
        <Input value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Depósito al banco, caja fuerte…" />
      </Field>
      <Button
        className="w-full"
        disabled={!(motivo.trim() && a > 0)}
        onClick={async () => {
          await addExpense(motivo.trim(), a, sessionId, 'retiro')
          onClose()
        }}
      >
        Registrar retiro
      </Button>
    </Sheet>
  )
}
