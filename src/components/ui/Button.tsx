import type { ButtonHTMLAttributes } from 'react'

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
