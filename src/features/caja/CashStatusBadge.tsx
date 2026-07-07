/** insignia de estado de la caja: abierta (punto lleno) o cerrada (punto vacío) */
export function CashStatusBadge({ open }: { open: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium ${
      open ? 'border-green-600/30 bg-green-100 text-green-700' : 'border-cream-300 bg-cream-200/60 text-berry-700'
    }`}>
      <span className={`h-2 w-2 rounded-full ${open ? 'bg-green-600' : 'border border-berry-700 bg-transparent'}`} />
      {open ? 'Caja abierta' : 'Caja cerrada'}
    </span>
  )
}
