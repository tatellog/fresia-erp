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
      <EmployeesCard />
      <CloudCard />
      <DemoCard />
      <BackupCard />
      <InstallCard />
      <DangerZoneCard />
      <p className="mt-6 text-center text-xs text-berry-700/40">Frésia OS v0.4 · hecho con amor</p>
    </div>
  )
}
