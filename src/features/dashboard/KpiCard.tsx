import type { ComponentType, SVGProps } from 'react'

/** KPI independiente: icono arriba, número grande, texto pequeño */
export function KpiCard({ icon: Icon, value, label, sub }: {
  icon: ComponentType<SVGProps<SVGSVGElement>>
  value: string
  label: string
  sub?: string
}) {
  return (
    <div className="rounded-3xl border border-cream-200 bg-cream-50 p-6">
      <span className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--color-blush)]/40 text-berry-500">
        <Icon className="h-5 w-5" />
      </span>
      <div className="truncate font-display text-[28px] font-bold leading-tight tabular-nums">{value}</div>
      <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-berry-700/55">{label}</div>
      {sub && <div className="mt-0.5 text-xs text-berry-700/50">{sub}</div>}
    </div>
  )
}
