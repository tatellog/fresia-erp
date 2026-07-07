/** barra de progreso grande hacia una meta */
export function GoalProgress({ label, valueLabel, pct }: { label: string; valueLabel: string; pct: number }) {
  const clamped = Math.max(0, Math.min(100, pct))
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-berry-700/60">{label}</span>
        <span className="text-sm font-semibold tabular-nums">{valueLabel}</span>
      </div>
      <div className="h-3.5 overflow-hidden rounded-full bg-[var(--color-blush)]/35">
        <div className="h-full rounded-full bg-berry-500 transition-all" style={{ width: `${clamped}%` }} />
      </div>
      <div className="mt-1.5 text-right text-xs font-medium text-berry-700/55">{clamped}%</div>
    </div>
  )
}
