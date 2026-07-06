import { NavLink } from 'react-router-dom'
import { tabs } from './tabs'
import { icons } from '../ui/icons'

/** tabs inferiores: teléfono e iPad vertical */
export function TabBar() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-cream-200 bg-cream-50/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-lg md:max-w-2xl">
        {tabs.map(t => {
          const Icon = icons[t.icon]
          return (
            <NavLink
              key={t.to}
              to={t.to}
              end={t.to === '/'}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-1 pt-2.5 text-[10px] font-medium uppercase tracking-[0.12em] ${
                  isActive ? 'text-berry-500' : 'text-berry-900/35'
                }`
              }
            >
              <Icon className="h-[21px] w-[21px]" />
              {t.label}
            </NavLink>
          )
        })}
      </div>
    </nav>
  )
}
