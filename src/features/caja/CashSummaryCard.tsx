import type { ComponentType, SVGProps } from 'react'

/** card grande del hero de Caja: icono, etiqueta y monto protagonista */
export function CashSummaryCard({ icon: Icon, label, value, hint }: {
  icon: ComponentType<SVGProps<SVGSVGElement>>
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="rounded-3xl border border-cream-200 bg-cream-50 p-6 shadow-[0_2px_10px_rgba(217,58,50,0.05)]">
      <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-blush)]/40 text-berry-500">
        <Icon className="h-5 w-5" />
      </span>
      <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-berry-700/60">{label}</div>
      <div className="mt-1 font-display text-[32px] font-bold leading-none tabular-nums">{value}</div>
      {hint && <div className="mt-1.5 text-xs text-berry-700/50">{hint}</div>}
    </div>
  )
}
