import { useEffect, useState } from 'react'
import { NavLink, Route, Routes } from 'react-router-dom'
import Vender from './pages/Vender'
import Productos from './pages/Productos'
import Inventario from './pages/Inventario'
import Caja from './pages/Caja'
import Reportes from './pages/Reportes'
import Ajustes from './pages/Ajustes'

const tabs = [
  { to: '/', label: 'Vender', icon: '🍓' },
  { to: '/inventario', label: 'Insumos', icon: '📦' },
  { to: '/productos', label: 'Menú', icon: '🍨' },
  { to: '/caja', label: 'Caja', icon: '💵' },
  { to: '/reportes', label: 'Reportes', icon: '📈' },
]

function useOnline() {
  const [online, setOnline] = useState(navigator.onLine)
  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])
  return online
}

const OfflineChip = () => (
  <span className="rounded-full bg-cream-200 px-2.5 py-1 text-xs font-semibold text-berry-700">
    sin internet · todo guardado ✓
  </span>
)

export default function App() {
  const online = useOnline()
  return (
    <div className="flex min-h-dvh">
      {/* barra lateral — iPad horizontal y pantallas grandes */}
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

      <div className="flex min-w-0 flex-1 flex-col">
        {/* encabezado — teléfono e iPad vertical */}
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

        <main className="mx-auto w-full max-w-lg flex-1 px-4 pb-28 md:max-w-2xl lg:max-w-6xl lg:px-8 lg:pb-10 lg:pt-6">
          <Routes>
            <Route path="/" element={<Vender />} />
            <Route path="/productos" element={<Productos />} />
            <Route path="/inventario" element={<Inventario />} />
            <Route path="/caja" element={<Caja />} />
            <Route path="/reportes" element={<Reportes />} />
            <Route path="/ajustes" element={<Ajustes />} />
          </Routes>
        </main>

        {/* tabs inferiores — teléfono e iPad vertical */}
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
      </div>
    </div>
  )
}
