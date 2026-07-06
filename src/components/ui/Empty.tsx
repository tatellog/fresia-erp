import { SparkleIcon } from './icons'

/** estado vacío con texto guía */
export function Empty({ text }: { text: string }) {
  return (
    <div className="py-16 text-center">
      <SparkleIcon className="mx-auto mb-3 h-7 w-7 text-berry-300" />
    <p className="mx-auto max-w-xs text-sm text-berry-700/60">{text}</p>
    </div>
  )
}
