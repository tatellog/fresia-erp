import { NavLink } from 'react-router-dom'
import { tabs } from './tabs'

/** tabs inferiores — teléfono e iPad vertical */
export function TabBar() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-cream-300 bg-cream-50/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-lg md:max-w-2xl">
        {tabs.map(t => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.to === '/'}
            className={({ isActive }) =>
              `flex flex-1 flex-col items-center gap-0.5 pt-2 text-[11px] font-semibold ${
                isActive ? 'text-berry-500' : 'text-berry-900/40'
              }`
            }
          >
            <span className="text-xl">{t.icon}</span>
            {t.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
