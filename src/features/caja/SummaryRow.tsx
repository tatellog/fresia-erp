import { money } from '../../lib/format'

/** renglón de concepto/monto en el resumen de caja */
export function SummaryRow({ label, value, bold, muted }: { label: string; value: number; bold?: boolean; muted?: boolean }) {
  return (
    <div className={`flex justify-between py-0.5 ${bold ? 'text-base font-bold' : 'text-sm'} ${muted ? 'text-berry-700/50' : ''}`}>
      <span>{label}</span>
      <span className="tabular-nums">{money(value)}</span>
    </div>
  )
}
