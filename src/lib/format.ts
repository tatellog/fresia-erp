const entero = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
const conCentavos = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

/** $99 para cantidades cerradas, $99.50 cuando hay centavos */
export const money = (n: number) => (Number.isInteger(round2(n)) ? entero.format(n) : conCentavos.format(n))

export const round2 = (n: number) => Math.round(n * 100) / 100

export const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })

export const fmtTime = (ts: number) =>
  new Date(ts).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

export const fmtDateTime = (ts: number) => `${fmtDate(ts)} · ${fmtTime(ts)}`

/** inicio del día local de hace `daysAgo` días */
export const startOfDay = (daysAgo = 0) => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - daysAgo)
  return d.getTime()
}
