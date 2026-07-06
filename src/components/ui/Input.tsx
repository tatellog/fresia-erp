import type { InputHTMLAttributes } from 'react'

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-cream-300 bg-white px-3 py-2.5 text-base outline-none focus:border-berry-400 ${props.className ?? ''}`}
    />
  )
}
