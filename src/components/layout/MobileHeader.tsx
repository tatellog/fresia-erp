import { NavLink } from 'react-router-dom'
import { OfflineChip } from './OfflineChip'
import { GearIcon } from '../ui/icons'
import { Wordmark } from './Wordmark'

/** encabezado superior: teléfono e iPad vertical */
export function MobileHeader({ online }: { online: boolean }) {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between bg-cream-100/90 px-4 pb-2.5 pt-[max(0.85rem,env(safe-area-inset-top))] backdrop-blur lg:hidden">
      <NavLink to="/">
        <Wordmark />
      </NavLink>
      <div className="flex items-center gap-3">
        {!online && <OfflineChip />}
        <NavLink to="/ajustes" aria-label="Ajustes" className="text-berry-900/55">
          <GearIcon className="h-5 w-5" />
        </NavLink>
      </div>
    </header>
  )
}
