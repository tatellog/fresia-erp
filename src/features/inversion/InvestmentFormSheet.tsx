import { useState } from 'react'
import type { Investment } from '../../data/types'
import { deleteInvestment, INVESTORS, saveInvestment } from '../../services/investments'
import { Button, Field, Input, Sheet } from '../../components/ui'

/** alta y edición de gastos de inversión */
export function InvestmentFormSheet({ investment, onClose }: { investment?: Investment; onClose: () => void }) {
  const [concept, setConcept] = useState(investment?.concept ?? '')
  const [amount, setAmount] = useState(investment ? String(investment.amount) : '')
  const [pending, setPending] = useState(investment ? String(investment.pending) : '0')
  const [paidBy, setPaidBy] = useState(investment?.paidBy ?? '')
  const a = parseFloat(amount)
  const valid = concept.trim() && a >= 0

  const toggle = (ini: string) =>
    setPaidBy(prev => (prev.includes(ini) ? prev.replace(ini, '') : prev + ini))

  return (
    <Sheet open onClose={onClose} title={investment ? `Editar · ${investment.concept}` : 'Nuevo gasto de inversión'}>
      <Field label="Concepto">
        <Input value={concept} onChange={e => setConcept(e.target.value)} placeholder="Renta, remodelación, equipo…" autoFocus={!investment} />
      </Field>
      <div className="flex gap-3">
        <div className="flex-1">
          <Field label="Monto ($)">
            <Input type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} />
          </Field>
        </div>
        <div className="flex-1">
          <Field label="Resta por pagar ($)">
            <Input type="number" inputMode="decimal" value={pending} onChange={e => setPending(e.target.value)} />
          </Field>
        </div>
      </div>
      <Field label="Pagado por">
        <div className="flex gap-2">
          {Object.entries(INVESTORS).map(([ini, nombre]) => (
            <button
              key={ini}
              onClick={() => toggle(ini)}
              className={`flex-1 rounded-xl py-2.5 text-sm font-semibold ${
                paidBy.includes(ini) ? 'bg-berry-500 text-white' : 'bg-cream-200 text-berry-700'
              }`}
            >
              {nombre}
            </button>
          ))}
        </div>
      </Field>
      <Button
        className="w-full"
        disabled={!valid}
        onClick={async () => {
          await saveInvestment({ concept: concept.trim(), amount: a, pending: parseFloat(pending) || 0, paidBy }, investment)
          onClose()
        }}
      >
        Guardar
      </Button>
      {investment && (
        <Button
          variant="danger"
          className="mt-2 w-full"
          onClick={async () => {
            if (confirm(`¿Eliminar "${investment.concept}" del registro de inversión?`)) {
              await deleteInvestment(investment.id)
              onClose()
            }
          }}
        >
          Eliminar
        </Button>
      )}
    </Sheet>
  )
}
