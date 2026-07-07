/** tamaños vendidos con barras minimalistas (ni pastel ni dona) */
export function TopSellingCard({ sizes }: { sizes: { size: string; count: number }[] }) {
  const max = Math.max(...sizes.map(s => s.count), 1)
  return (
    <div className="rounded-3xl border border-cream-200 bg-cream-50 p-6">
      <h2 className="mb-5 text-xl font-semibold">Tamaños vendidos</h2>
      <div className="space-y-4">
        {sizes.map(s => (
          <div key={s.size} className="flex items-center gap-4">
            <span className="w-16 shrink-0 text-sm font-medium">{s.size}</span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-cream-200/80">
              <div className="h-full rounded-full bg-berry-400" style={{ width: `${(s.count / max) * 100}%` }} />
            </div>
            <span className="w-8 shrink-0 text-right text-sm font-semibold tabular-nums">{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
