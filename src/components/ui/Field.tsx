import type { ReactNode } from 'react'

/** etiqueta + control de formulario */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-sm font-medium text-berry-700">{label}</span>
      {children}
    </label>
  )
}
