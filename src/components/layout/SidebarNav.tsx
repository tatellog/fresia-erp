import { NavLink } from 'react-router-dom'
import { tabs } from './tabs'
import { OfflineChip } from './OfflineChip'
import { icons, GearIcon } from '../ui/icons'
import { Wordmark } from './Wordmark'

/** navegación lateral: iPad horizontal y pantallas grandes */
export function SidebarNav({ online }: { online: boolean }) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-cream-200 bg-cream-50 px-5 pb-6 pt-[max(1.75rem,env(safe-area-inset-top))] lg:flex">
      <NavLink to="/" className="mb-10 px-2">
        <Wordmark size="lg" />
      </NavLink>
      <nav className="flex flex-col gap-1.5">
        {tabs.map(t => {
          const Icon = icons[t.icon]
          return (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3.5 rounded-full px-4 py-2.5 text-[15px] font-medium tracking-wide transition-colors ${
                  isActive ? 'bg-berry-500 text-cream-50 shadow-sm' : 'text-berry-900/55 hover:bg-cream-200/70'
                }`
              }
            >
              <Icon className="h-[19px] w-[19px]" />
              {t.label}
            </NavLink>
          )
        })}
      </nav>
      <div className="mt-auto flex flex-col gap-3 px-2">
        {!online && <OfflineChip />}
        <NavLink
          to="/ajustes"
          className={({ isActive }) =>
            `flex items-center gap-3.5 px-2 py-2 text-[15px] font-medium tracking-wide ${isActive ? 'text-berry-500' : 'text-berry-900/55'}`
          }
        >
          <GearIcon className="h-[19px] w-[19px]" /> Ajustes
        </NavLink>
      </div>
    </aside>
  )
}
