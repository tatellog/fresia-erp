import { NavLink } from 'react-router-dom'
import { tabs } from './tabs'
import { OfflineChip } from './OfflineChip'

/** navegación lateral — iPad horizontal y pantallas grandes */
export function SidebarNav({ online }: { online: boolean }) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-56 shrink-0 flex-col border-r border-cream-300 bg-cream-50 px-4 pb-6 pt-[max(1.5rem,env(safe-area-inset-top))] lg:flex">
      <NavLink to="/" className="mb-8 flex items-center gap-2.5 px-2">
        <img src="/icons/icon-192.png" alt="" className="h-10 w-10" />
        <span className="text-2xl font-extrabold tracking-tight text-berry-500">fresia</span>
      </NavLink>
      <nav className="flex flex-col gap-1">
        {tabs.map(t => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 font-semibold transition-colors ${
                isActive ? 'bg-berry-500 text-white' : 'text-berry-900/60 hover:bg-cream-200'
              }`
            }
          >
            <span className="text-xl">{t.icon}</span>
            {t.label}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-3 px-2">
        {!online && <OfflineChip />}
        <NavLink
          to="/ajustes"
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-1 py-2 font-semibold ${isActive ? 'text-berry-500' : 'text-berry-900/60'}`
          }
        >
          <span className="text-xl">⚙️</span> Ajustes
        </NavLink>
      </div>
    </aside>
  )
}
