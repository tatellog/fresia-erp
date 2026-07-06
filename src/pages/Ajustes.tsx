import { CloudCard } from '../features/ajustes/CloudCard'
import { BackupCard } from '../features/ajustes/BackupCard'
import { InstallCard } from '../features/ajustes/InstallCard'
import { DangerZoneCard } from '../features/ajustes/DangerZoneCard'

export default function Ajustes() {
  return (
    <div className="mx-auto max-w-2xl pt-2 lg:pt-0">
      <h1 className="mb-3 text-lg font-bold">Ajustes</h1>
      <CloudCard />
      <BackupCard />
      <InstallCard />
      <DangerZoneCard />
      <p className="mt-6 text-center text-xs text-berry-700/40">Fresia ERP v0.2 · hecho con 🍓</p>
    </div>
  )
}
