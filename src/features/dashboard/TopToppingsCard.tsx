/** toppings más utilizados, con ranking y barras pequeñas */
export function TopToppingsCard({ toppings }: { toppings: { name: string; count: number }[] }) {
  const max = Math.max(...toppings.map(t => t.count), 1)
  return (
    <div className="rounded-3xl border border-cream-200 bg-cream-50 p-6">
      <h2 className="mb-5 text-xl font-semibold">Toppings más utilizados</h2>
      {toppings.length === 0 && <p className="py-4 text-sm text-berry-700/50">Aún no hay vasos con toppings hoy.</p>}
      <div className="space-y-3.5">
        {toppings.map((t, i) => (
          <div key={t.name} className="flex items-center gap-3">
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
              i === 0 ? 'bg-berry-500 text-white' : i < 3 ? 'bg-[var(--color-blush)]/50 text-berry-600' : 'bg-cream-200 text-berry-700/60'
            }`}>
              {i + 1}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{t.name}</span>
            <div className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-cream-200/80">
              <div className="h-full rounded-full bg-berry-400" style={{ width: `${(t.count / max) * 100}%` }} />
            </div>
            <span className="w-7 shrink-0 text-right text-sm font-semibold tabular-nums">{t.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
