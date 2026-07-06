/** control − / + para cantidades */
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
