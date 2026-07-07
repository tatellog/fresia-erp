import type { ButtonHTMLAttributes } from 'react'

const variants = {
  primary: 'bg-berry-500 text-white active:bg-berry-600 shadow-sm tracking-wide',
  soft: 'bg-berry-100 text-berry-700 active:bg-berry-200 tracking-wide',
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
      className={`rounded-full px-5 py-3 font-medium transition-colors disabled:opacity-40 ${variants[variant]} ${className}`}
      {...props}
    />
  )
}
