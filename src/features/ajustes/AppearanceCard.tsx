import { useEffect, useState } from 'react'
import { getThemePref, setThemePref, type ThemePref } from '../../hooks/useTheme'
import { Card } from '../../components/ui'

const opciones: { id: ThemePref; label: string }[] = [
  { id: 'claro', label: 'Claro' },
  { id: 'oscuro', label: 'Oscuro' },
  { id: 'auto', label: 'Automático' },
]

/** tema de la interfaz: claro, oscuro o según el sistema */
export function AppearanceCard() {
  const [pref, setPref] = useState<ThemePref>('auto')
  useEffect(() => { getThemePref().then(setPref) }, [])

  const elegir = async (p: ThemePref) => {
    setPref(p)
    await setThemePref(p)
  }

  return (
    <Card className="mb-3">
      <h2 className="mb-1 font-bold">Apariencia</h2>
      <p className="mb-3 text-sm text-berry-700/70">
        El modo oscuro descansa la vista en la noche. En automático sigue al iPad o teléfono.
      </p>
      <div className="grid grid-cols-3 gap-2">
        {opciones.map(o => (
          <button
            key={o.id}
            onClick={() => elegir(o.id)}
            className={`rounded-xl py-2.5 text-sm font-semibold ${
              pref === o.id ? 'bg-berry-500 text-white' : 'bg-cream-200 text-berry-700'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </Card>
  )
}
