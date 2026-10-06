import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { addExpense } from '../../services/cash'
import { frequentConcepts } from '../../services/suggestions'
import { Button, decimal, Field, Input, NumberInput, QuickChips, Sheet } from '../../components/ui'

/** retiro de efectivo del cajón (a banco o caja fuerte); los motivos de siempre van a un toque */
export function RetiroSheet({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const motivos = useLiveQuery(() => frequentConcepts('retiro', 5))
  const [motivo, setMotivo] = useState('')
  const [amount, setAmount] = useState('')
  const a = decimal(amount)
  return (
    <Sheet open onClose={onClose} title="Retiro de efectivo">
      <Field label="Monto ($)">
        <NumberInput value={amount} onChange={e => setAmount(e.target.value)} autoFocus />
      </Field>
      <Field label="Motivo">
        <QuickChips options={motivos ?? []} value={motivo} onPick={setMotivo} />
        <Input value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="O escribe otro…" />
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
