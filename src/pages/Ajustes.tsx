import { AppearanceCard } from '../features/ajustes/AppearanceCard'
import { CatalogUpdateCard } from '../features/ajustes/CatalogUpdateCard'
import { CloudCard } from '../features/ajustes/CloudCard'
import { EmployeesCard } from '../features/ajustes/EmployeesCard'
import { DemoCard } from '../features/ajustes/DemoCard'
import { BackupCard } from '../features/ajustes/BackupCard'
import { InstallCard } from '../features/ajustes/InstallCard'
import { DangerZoneCard } from '../features/ajustes/DangerZoneCard'

export default function Ajustes() {
  return (
    <div className="mx-auto max-w-2xl pt-2 lg:pt-0">
      <h1 className="mb-3 text-2xl font-bold">Ajustes</h1>
      <CatalogUpdateCard />
      <AppearanceCard />
      <EmployeesCard />
      <CloudCard />
      <DemoCard />
      <BackupCard />
      <InstallCard />
      <DangerZoneCard />
      <p className="mt-6 text-center font-display text-sm italic text-berry-700/45">Fresas, momentos y sonrisas.</p>
      <p className="mt-1 text-center text-xs text-berry-700/35">Frésia OS v0.5</p>
    </div>
  )
}
