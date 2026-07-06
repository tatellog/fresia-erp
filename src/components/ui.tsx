import type { ReactNode, ButtonHTMLAttributes, InputHTMLAttributes } from 'react'

// ── Botón ────────────────────────────────────────────────────────────

const variants = {
  primary: 'bg-berry-500 text-white active:bg-berry-600 shadow-sm',
  soft: 'bg-berry-100 text-berry-700 active:bg-berry-200',
  ghost: 'text-berry-600 active:bg-berry-50',
  danger: 'bg-red-50 text-red-700 active:bg-red-100',
}

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants }) {
  return (
    <button
      className={`rounded-2xl px-4 py-3 font-semibold transition-colors disabled:opacity-40 ${variants[variant]} ${className}`}
      {...props}
    />
  )
}

// ── Bottom sheet ─────────────────────────────────────────────────────

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

// ── Campos de formulario ─────────────────────────────────────────────

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-sm font-medium text-berry-700">{label}</span>
      {children}
    </label>
  )
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-cream-300 bg-white px-3 py-2.5 text-base outline-none focus:border-berry-400 ${props.className ?? ''}`}
    />
  )
}

// ── Varios ───────────────────────────────────────────────────────────

export function Card({ className = '', children, onClick }: { className?: string; children: ReactNode; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={`rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(174,48,40,0.08)] ${className}`}>
      {children}
    </div>
  )
}

export function Empty({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="py-14 text-center">
      <div className="mb-2 text-4xl">{emoji}</div>
      <p className="text-sm text-berry-700/60">{text}</p>
    </div>
  )
}

export function Stepper({ value, onChange, min = 0 }: { value: number; onChange: (v: number) => void; min?: number }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange(Math.max(min, value - 1))}
        className="h-9 w-9 rounded-full bg-berry-100 text-lg font-bold text-berry-700 active:bg-berry-200"
      >
        −
      </button>
      <span className="w-7 text-center text-base font-bold tabular-nums">{value}</span>
      <button
        onClick={() => onChange(value + 1)}
        className="h-9 w-9 rounded-full bg-berry-500 text-lg font-bold text-white active:bg-berry-600"
      >
        +
      </button>
    </div>
  )
}
