import { money } from '../../lib/format'

/** aviso ámbar cuando el contado no cuadra: pide justificar la diferencia */
export function CashDifferenceCard({ diff, note, setNote }: {
  diff: number
  note: string
  setNote: (v: string) => void
}) {
  return (
    <div className="rounded-2xl border border-amber-600/25 bg-amber-50 p-4">
      <p className="mb-2 text-sm font-semibold text-amber-800">
        {diff > 0 ? `Sobran ${money(diff)}` : `Faltan ${money(Math.abs(diff))}`} · explica la diferencia
      </p>
      <textarea
        value={note}
        onChange={e => setNote(e.target.value)}
        rows={2}
        placeholder="P. ej. se dio cambio de más en una venta, un billete falso, propina en caja…"
        className="w-full resize-none rounded-xl border border-amber-600/20 bg-cream-50 px-3 py-2.5 text-sm outline-none focus:border-amber-600/50"
      />
    </div>
  )
}
