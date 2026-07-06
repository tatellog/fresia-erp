import { Card } from '../../components/ui'

/** indicador numérico grande para el tablero de reportes */
export function StatCard({ label, value, accent = '' }: { label: string; value: string; accent?: string }) {
  return (
    <Card className="py-3">
      <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-berry-700/55">{label}</div>
      <div className={`font-display text-2xl font-bold tabular-nums ${accent}`}>{value}</div>
    </Card>
  )
}
