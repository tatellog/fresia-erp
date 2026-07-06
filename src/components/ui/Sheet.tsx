import type { ReactNode } from 'react'

/** hoja modal inferior para formularios y confirmaciones */
export function Sheet({ open, onClose, title, children }: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 bg-berry-900/40 backdrop-blur-[2px]" onClick={onClose} />
      <div className="relative max-h-[88dvh] overflow-y-auto rounded-t-3xl bg-cream-50 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-berry-200" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="rounded-full bg-cream-200 px-3 py-1 text-sm font-medium text-berry-700">
            Cerrar
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
