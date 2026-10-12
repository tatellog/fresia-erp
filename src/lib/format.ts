const entero = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })
const conCentavos = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' })

/** $99 para cantidades cerradas, $99.50 cuando hay centavos */
export const money = (n: number) => (Number.isInteger(round2(n)) ? entero.format(n) : conCentavos.format(n))

/** totales grandes sin centavos: $2,304 */
export const moneyInt = (n: number) => entero.format(Math.round(n))

export const round2 = (n: number) => Math.round(n * 100) / 100

export const fmtDate = (ts: number) =>
  new Date(ts).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })

export const fmtTime = (ts: number) =>
  new Date(ts).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })

/** día de la semana y fecha: sábado 10 de octubre */
export const fmtWeekday = (ts: number) =>
  new Date(ts).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })

/** hora sola si es de hoy; si no, con el día: «sáb 10 oct · 01:40 p.m.» */
export const fmtSince = (ts: number) =>
  ts >= startOfDay(0)
    ? fmtTime(ts)
    : `${new Date(ts).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })} · ${fmtTime(ts)}`

export const fmtDateTime = (ts: number) => `${fmtDate(ts)} · ${fmtTime(ts)}`

/** inicio del día local de hace `daysAgo` días */
export const startOfDay = (daysAgo = 0) => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - daysAgo)
  return d.getTime()
}
