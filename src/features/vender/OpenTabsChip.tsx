/** chip "Cuentas abiertas · 3": solo aparece cuando hay alguna */
export function OpenTabsChip({ count, onClick }: { count: number; onClick: () => void }) {
  if (count === 0) return null
  return (
    <button
      onClick={onClick}
      className="mb-3 inline-flex items-center gap-2 rounded-full border border-berry-500 bg-berry-50 px-3.5 py-1.5 text-xs font-semibold tracking-wide text-berry-600"
    >
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-berry-500" />
      Cuentas abiertas · {count}
    </button>
  )
}
