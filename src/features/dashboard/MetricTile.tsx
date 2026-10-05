/** cifra del periodo con su variación contra el periodo anterior */
export function MetricTile({ label, value, change, invert = false, hint, unit = '%' }: {
  label: string
  value: string
  /** % contra el periodo anterior; null = sin base */
  change: number | null
  /** para costos: subir es malo */
  invert?: boolean
  hint?: string
  /** '%' = variación porcentual; 'pts' = diferencia en puntos (para márgenes) */
  unit?: '%' | 'pts'
}) {
  const bueno = change !== null && (invert ? change < 0 : change > 0)
  const neutro = change === null || Math.abs(change) < 0.5
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-berry-700/55">{label}</div>
      <div className="mt-1 truncate font-display text-[26px] font-bold leading-tight tabular-nums">{value}</div>
      <div className="mt-0.5 text-xs">
        {change === null ? (
          <span className="text-berry-700/45">{hint ?? 'sin periodo anterior'}</span>
        ) : (
          <span className={`font-semibold ${neutro ? 'text-berry-700/60' : bueno ? 'text-green-700' : 'text-red-600'}`}>
            {neutro ? '=' : change > 0 ? '↑' : '↓'} {Math.abs(change).toLocaleString('es-MX')}{unit === 'pts' ? ' pts' : '%'}
          </span>
        )}
      </div>
    </div>
  )
}
