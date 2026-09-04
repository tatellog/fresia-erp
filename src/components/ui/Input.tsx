import type { InputHTMLAttributes } from 'react'

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full rounded-xl border border-cream-300 bg-cream-50 px-3 py-2.5 text-base outline-none focus:border-berry-400 ${props.className ?? ''}`}
    />
  )
}

/**
 * Campo numérico de captura a mano. Va como texto a propósito: un
 * `type="number"` descarta la coma decimal del teclado en español y "12,5"
 * se guardaría como 125. Aquí la coma se conserva y `decimal()` la traduce.
 */
export function NumberInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <Input {...props} type="text" inputMode="decimal" />
}

/** número escrito a mano: acepta coma decimal y campo vacío (= 0) */
export const decimal = (v: string) => {
  const n = parseFloat(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : 0
}
