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

export default function App() {
  const online = useOnline()
  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col">
      <header className="sticky top-0 z-40 flex items-center justify-between bg-cream-100/90 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
        <NavLink to="/" className="flex items-center gap-2">
          <img src="/icons/icon-192.png" alt="" className="h-8 w-8" />
          <span className="text-xl font-extrabold tracking-tight text-berry-500">fresia</span>
        </NavLink>
        <div className="flex items-center gap-3">
          {!online && (
            <span className="rounded-full bg-cream-200 px-2.5 py-1 text-xs font-semibold text-berry-700">
              sin internet · todo guardado ✓
            </span>
          )}
          <NavLink to="/ajustes" className="text-xl" aria-label="Ajustes">⚙️</NavLink>
        </div>
      </header>

      <main className="flex-1 px-4 pb-28">
        <Routes>
          <Route path="/" element={<Vender />} />
          <Route path="/productos" element={<Productos />} />
          <Route path="/inventario" element={<Inventario />} />
          <Route path="/caja" element={<Caja />} />
          <Route path="/reportes" element={<Reportes />} />
          <Route path="/ajustes" element={<Ajustes />} />
        </Routes>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-lg border-t border-cream-300 bg-cream-50/95 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur">
        <div className="flex">
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
  )
}
