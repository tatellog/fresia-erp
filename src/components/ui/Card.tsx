import type { ReactNode } from 'react'

export function Card({ className = '', children, onClick }: { className?: string; children: ReactNode; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={`rounded-2xl bg-white p-4 shadow-[0_1px_3px_rgba(174,48,40,0.08)] ${className}`}>
      {children}
    </div>
  )
}
