import { useState } from 'react'
import type { CashSession } from '../../data/types'
import { closeCash } from '../../services/cash'
import { money, round2 } from '../../lib/format'
import { Button, Field, Input, Sheet } from '../../components/ui'

/** corte de caja: compara efectivo contado vs. esperado */
export function CerrarSheet({ session, expected, onClose }: { session: CashSession; expected: number; onClose: () => void }) {
  const [counted, setCounted] = useState('')
  const c = parseFloat(counted)
  const diff = round2((c || 0) - expected)
  return (
    <Sheet open onClose={onClose} title="Corte de caja">
      <p className="mb-3 text-sm text-berry-700/70">
        Efectivo esperado: <b>{money(expected)}</b>. Cuenta el dinero de la caja y captura el total.
      </p>
      <Field label="Efectivo contado ($)">
        <Input type="number" inputMode="decimal" value={counted} onChange={e => setCounted(e.target.value)} autoFocus />
      </Field>
      {counted !== '' && (
        <p className={`mb-3 text-sm font-semibold ${diff >= 0 ? 'text-green-700' : 'text-red-600'}`}>
          {diff === 0 ? '✓ Cuadra exacto' : diff > 0 ? `Sobran ${money(diff)}` : `Faltan ${money(Math.abs(diff))}`}
        </p>
      )}
      <Button
        className="w-full"
        disabled={!(c >= 0)}
        onClick={async () => {
          await closeCash(session, c, expected)
          onClose()
        }}
      >
        Cerrar caja
      </Button>
    </Sheet>
  )
}
