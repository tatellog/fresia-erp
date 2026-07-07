/** alertas accionables del día */
export function AlertBanner({ alerts }: { alerts: string[] }) {
  if (alerts.length === 0) {
    return (
      <div className="rounded-2xl border border-green-600/25 bg-green-100 px-5 py-4 text-sm font-medium text-green-700">
        Todo en orden: sin alertas por ahora.
      </div>
    )
  }
  return (
    <div className="space-y-2.5">
      {alerts.map(a => (
        <div key={a} className="rounded-2xl border border-amber-600/25 bg-amber-50 px-5 py-4 text-sm font-medium text-amber-800">
          {a}
        </div>
      ))}
    </div>
  )
}
