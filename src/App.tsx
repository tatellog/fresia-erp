import { Route, Routes } from 'react-router-dom'
import { useOnline } from './hooks/useOnline'
import { SidebarNav } from './components/layout/SidebarNav'
import { MobileHeader } from './components/layout/MobileHeader'
import { TabBar } from './components/layout/TabBar'
import Vender from './pages/Vender'
import Productos from './pages/Productos'
import Inventario from './pages/Inventario'
import Caja from './pages/Caja'
import Reportes from './pages/Reportes'
import Ajustes from './pages/Ajustes'

export default function App() {
  const online = useOnline()
  return (
    <div className="flex min-h-dvh">
      <SidebarNav online={online} />
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileHeader online={online} />
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
        <TabBar />
      </div>
    </div>
  )
}
