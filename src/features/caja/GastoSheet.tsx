import { useState } from 'react'
import type { ExpensePayment } from '../../data/types'
import { addExpense } from '../../services/cash'
import { Button, decimal, Field, Input, NumberInput, Sheet } from '../../components/ui'
import { ExpensePaymentPicker } from './ExpensePaymentPicker'

/** registro de un gasto del turno con su forma de pago */
export function GastoSheet({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const [concept, setConcept] = useState('')
  const [amount, setAmount] = useState('')
  const [payment, setPayment] = useState<ExpensePayment>('efectivo')
  const a = decimal(amount)
  return (
    <Sheet open onClose={onClose} title="Registrar gasto">
      <Field label="Concepto">
        <Input value={concept} onChange={e => setConcept(e.target.value)} placeholder="Hielo, bolsas, gasolina…" autoFocus />
      </Field>
      <Field label="Monto ($)">
        <NumberInput value={amount} onChange={e => setAmount(e.target.value)} />
      </Field>
      <ExpensePaymentPicker value={payment} onChange={p => setPayment(p as ExpensePayment)} />
      <Button
        className="w-full"
        disabled={!(concept.trim() && a > 0)}
        onClick={async () => {
          await addExpense(concept.trim(), a, sessionId, 'gasto', payment)
          onClose()
        }}
      >
        Guardar gasto
      </Button>
    </Sheet>
  )
}
