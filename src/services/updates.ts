import { registerSW } from 'virtual:pwa-register'

/** cada cuánto se pregunta al servidor si hay versión nueva */
const CHECK_EVERY_MS = 30 * 60 * 1000
/** sin tocar la pantalla este tiempo se considera que nadie está a media venta */
const IDLE_MS = 20 * 1000

let lastInput = Date.now()
const touch = () => { lastInput = Date.now() }

/**
 * Mantiene las apps instaladas al día sin que nadie haga nada: revisa si hay
 * versión nueva cada media hora, al volver a la app y al recuperar la red; y
 * cuando la hay, recarga en cuanto la pantalla lleve un rato sin uso (o esté
 * en segundo plano) para no interrumpir una venta a medias.
 */
export function startAutoUpdate() {
  if (!('serviceWorker' in navigator)) return
  for (const ev of ['pointerdown', 'keydown'] as const) window.addEventListener(ev, touch, { passive: true })

  registerSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      if (!registration) return
      const check = () => {
        if (navigator.onLine) registration.update().catch(() => {})
      }
      setInterval(check, CHECK_EVERY_MS)
      window.addEventListener('online', check)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
    },
    onNeedReload() {
      const idle = () => document.visibilityState === 'hidden' || Date.now() - lastInput > IDLE_MS
      if (idle()) return window.location.reload()
      const timer = setInterval(() => {
        if (idle()) {
          clearInterval(timer)
          window.location.reload()
        }
      }, 2000)
    },
  })
}
