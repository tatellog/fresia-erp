import { useEffect, useState } from 'react'
import { db } from '../../data/db'
import { Button, Card, Field, Input } from '../../components/ui'

/** metas diarias del dashboard: dinero y vasos */
export function GoalsCard() {
  const [moneyGoal, setMoneyGoal] = useState('')
  const [cupsGoal, setCupsGoal] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    db.meta.get('goalMoney').then(m => setMoneyGoal(m?.value ?? '2500'))
    db.meta.get('goalCups').then(m => setCupsGoal(m?.value ?? '30'))
  }, [])

  const save = async () => {
    await db.meta.bulkPut([
      { key: 'goalMoney', value: String(Math.max(1, parseFloat(moneyGoal) || 2500)) },
      { key: 'goalCups', value: String(Math.max(1, parseInt(cupsGoal) || 30)) },
    ])
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <Card className="mb-3">
      <h2 className="mb-1 font-bold">Metas diarias</h2>
      <p className="mb-3 text-sm text-berry-700/70">El Dashboard mide el avance del día contra estas metas.</p>
      <div className="flex gap-3">
        <div className="flex-1">
          <Field label="Meta de ventas ($)">
            <Input type="number" inputMode="numeric" value={moneyGoal} onChange={e => setMoneyGoal(e.target.value)} />
          </Field>
        </div>
        <div className="flex-1">
          <Field label="Meta de vasos">
            <Input type="number" inputMode="numeric" value={cupsGoal} onChange={e => setCupsGoal(e.target.value)} />
          </Field>
        </div>
      </div>
      <Button variant="soft" onClick={save}>{saved ? 'Guardado' : 'Guardar metas'}</Button>
    </Card>
  )
}
