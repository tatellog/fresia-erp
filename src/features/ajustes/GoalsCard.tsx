import { useEffect, useState } from 'react'
import { db } from '../../data/db'
import { Button, Card, Field, Input } from '../../components/ui'

/** metas diarias del dashboard: dinero y productos vendidos */
export function GoalsCard() {
  const [moneyGoal, setMoneyGoal] = useState('')
  const [cupsGoal, setCupsGoal] = useState('')
  // vacío = meta diaria × días del mes
  const [monthGoal, setMonthGoal] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    db.meta.get('goalMoney').then(m => setMoneyGoal(m?.value ?? '2500'))
    db.meta.get('goalCups').then(m => setCupsGoal(m?.value ?? '30'))
    db.meta.get('goalMonth').then(m => setMonthGoal(m?.value ?? ''))
  }, [])

  const save = async () => {
    await db.meta.bulkPut([
      { key: 'goalMoney', value: String(Math.max(1, parseFloat(moneyGoal) || 2500)) },
      { key: 'goalCups', value: String(Math.max(1, parseInt(cupsGoal) || 30)) },
      { key: 'goalMonth', value: parseFloat(monthGoal) > 0 ? String(parseFloat(monthGoal)) : '' },
    ])
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <Card className="mb-3">
      <h2 className="mb-1 font-bold">Metas</h2>
      <p className="mb-3 text-sm text-berry-700/70">El Dashboard mide el avance del día y del mes contra estas metas.</p>
      <div className="flex gap-3">
        <div className="flex-1">
          <Field label="Meta de ventas ($)">
            <Input type="number" inputMode="numeric" value={moneyGoal} onChange={e => setMoneyGoal(e.target.value)} />
          </Field>
        </div>
        <div className="flex-1">
          <Field label="Meta de productos vendidos">
            <Input type="number" inputMode="numeric" value={cupsGoal} onChange={e => setCupsGoal(e.target.value)} />
          </Field>
        </div>
      </div>
      <Field label="Meta del mes ($)">
        <Input
          type="number"
          inputMode="numeric"
          value={monthGoal}
          placeholder={`Vacío = meta diaria × días del mes (${(parseFloat(moneyGoal) || 2500) * new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()})`}
          onChange={e => setMonthGoal(e.target.value)}
        />
      </Field>
      <Button variant="soft" onClick={save}>{saved ? 'Guardado' : 'Guardar metas'}</Button>
    </Card>
  )
}
