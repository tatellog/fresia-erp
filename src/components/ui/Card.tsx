import type { ReactNode } from 'react'

export function Card({ className = '', children, onClick }: { className?: string; children: ReactNode; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      className={`rounded-2xl border border-cream-200 bg-white p-4 shadow-[0_1px_2px_rgba(174,48,40,0.05)] ${className}`}
    >
      {children}
    </div>
  )
}
