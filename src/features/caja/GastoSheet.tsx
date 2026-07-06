import { useState } from 'react'
import { addExpense } from '../../services/cash'
import { Button, Field, Input, Sheet } from '../../components/ui'

/** registro de un gasto del turno */
export function GastoSheet({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const [concept, setConcept] = useState('')
  const [amount, setAmount] = useState('')
  const a = parseFloat(amount)
  return (
    <Sheet open onClose={onClose} title="Registrar gasto">
      <Field label="Concepto">
        <Input value={concept} onChange={e => setConcept(e.target.value)} placeholder="Hielo, bolsas, gasolina…" autoFocus />
      </Field>
      <Field label="Monto ($)">
        <Input type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} />
      </Field>
      <Button
        className="w-full"
        disabled={!(concept.trim() && a > 0)}
        onClick={async () => {
          await addExpense(concept.trim(), a, sessionId)
          onClose()
        }}
      >
        Guardar gasto
      </Button>
    </Sheet>
  )
}
