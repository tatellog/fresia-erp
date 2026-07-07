import type { ComponentType, SVGProps } from 'react'

/** botón de acción grande, táctil, con icono */
export function QuickActionButton({ icon: Icon, label, onClick, disabled, primary }: {
  icon: ComponentType<SVGProps<SVGSVGElement>>
  label: string
  onClick: () => void
  disabled?: boolean
  primary?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex flex-col items-center gap-2.5 rounded-3xl border px-4 py-6 font-medium tracking-wide transition-all active:scale-[0.97] disabled:opacity-35 ${
        primary
          ? 'border-berry-500 bg-berry-500 text-white shadow-md'
          : 'border-cream-200 bg-cream-50 text-berry-900 hover:border-berry-200'
      }`}
    >
      <Icon className="h-6 w-6" />
      <span className="text-sm">{label}</span>
    </button>
  )
}
