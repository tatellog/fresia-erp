import { useEffect, useState } from 'react'
import { ensurePersistentStorage } from '../../data/init'
import { Card } from '../../components/ui'

/** instrucciones para instalar la PWA y estado de protección del almacenamiento */
export function InstallCard() {
  const [persisted, setPersisted] = useState<boolean | null>(null)

  useEffect(() => {
    ensurePersistentStorage().then(setPersisted)
  }, [])

  return (
    <Card className="mb-3">
      <h2 className="mb-1 font-bold">Instalar como app</h2>
      <p className="text-sm text-berry-700/70">
        En iPhone/iPad: abre en Safari → botón compartir → «Agregar a inicio». En Android: Chrome te ofrecerá «Instalar app».
        Una vez instalada, abre y funciona igual con o sin internet.
      </p>
      {persisted === true && (
        <p className="mt-2 text-sm font-semibold">✓ Almacenamiento protegido: el navegador no borrará los datos locales.</p>
      )}
      {persisted === false && (
        <p className="mt-2 text-sm font-semibold text-amber-700">
          El navegador aún no garantiza conservar los datos si el dispositivo se queda sin espacio. Instala la app en la
          pantalla de inicio y mantén la sesión de nube activa para que todo quede respaldado.
        </p>
      )}
    </Card>
  )
}
