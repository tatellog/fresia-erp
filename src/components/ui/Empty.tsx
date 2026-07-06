/** estado vacío con emoji y texto guía */
export function Empty({ emoji, text }: { emoji: string; text: string }) {
  return (
    <div className="py-14 text-center">
      <div className="mb-2 text-4xl">{emoji}</div>
      <p className="text-sm text-berry-700/60">{text}</p>
    </div>
  )
}
