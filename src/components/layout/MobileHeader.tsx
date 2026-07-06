import { NavLink } from 'react-router-dom'
import { OfflineChip } from './OfflineChip'

/** encabezado superior — teléfono e iPad vertical */
export function MobileHeader({ online }: { online: boolean }) {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between bg-cream-100/90 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur lg:hidden">
      <NavLink to="/" className="flex items-center gap-2">
        <img src="/icons/icon-192.png" alt="" className="h-8 w-8" />
        <span className="text-xl font-extrabold tracking-tight text-berry-500">fresia</span>
      </NavLink>
      <div className="flex items-center gap-3">
        {!online && <OfflineChip />}
        <NavLink to="/ajustes" className="text-xl" aria-label="Ajustes">⚙️</NavLink>
      </div>
    </header>
  )
}
