import { Card } from '../../components/ui'

/** indicador numérico grande para el tablero de reportes */
export function StatCard({ label, value, accent = '' }: { label: string; value: string; accent?: string }) {
  return (
    <Card className="py-3">
      <div className="text-xs font-medium text-berry-700/60">{label}</div>
      <div className={`text-xl font-extrabold tabular-nums ${accent}`}>{value}</div>
    </Card>
  )
}
