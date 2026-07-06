import { Card } from '../../components/ui'

/** instrucciones para instalar la PWA en el dispositivo */
export function InstallCard() {
  return (
    <Card className="mb-3">
      <h2 className="mb-1 font-bold">Instalar como app</h2>
      <p className="text-sm text-berry-700/70">
        En iPhone/iPad: abre en Safari → botón compartir → «Agregar a inicio». En Android: Chrome te ofrecerá «Instalar app».
        Una vez instalada, abre y funciona igual con o sin internet.
      </p>
    </Card>
  )
}
