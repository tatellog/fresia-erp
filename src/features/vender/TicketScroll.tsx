import { useEffect, useRef, useState, type ReactNode } from 'react'

/**
 * Lista del ticket que se desliza por dentro, para que el total y el cobro
 * no se salgan de la pantalla en una cuenta grande. Cuando hay renglones
 * escondidos lo dice con un aviso tocable, y al agregar un producto baja
 * sola hasta el último para que se vea lo que se acaba de poner.
 */
export function TicketScroll({ count, children }: { count: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [arriba, setArriba] = useState(false)
  const [abajo, setAbajo] = useState(false)
  const previo = useRef(count)

  const medir = () => {
    const el = ref.current
    if (!el) return
    setArriba(el.scrollTop > 4)
    setAbajo(el.scrollTop + el.clientHeight < el.scrollHeight - 4)
  }

  useEffect(() => {
    const el = ref.current
    if (el && count > previo.current) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    previo.current = count
    medir()
  }, [count])

  useEffect(() => {
    const el = ref.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const obs = new ResizeObserver(medir)
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const bajar = () => ref.current?.scrollBy({ top: ref.current.clientHeight * 0.8, behavior: 'smooth' })

  return (
    <div className="relative -mx-5 flex min-h-[7rem] flex-1 flex-col">
      <div ref={ref} onScroll={medir} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5">
        {children}
      </div>
      {arriba && (
        <div className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-cream-50 to-transparent" />
      )}
      {abajo && (
        <>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-cream-50 to-transparent" />
          <button
            onClick={bajar}
            className="absolute bottom-1.5 left-1/2 -translate-x-1/2 rounded-full bg-berry-500 px-3.5 py-1 text-xs font-semibold text-white shadow-md active:bg-berry-600"
          >
            Hay más abajo ↓
          </button>
        </>
      )}
    </div>
  )
}
