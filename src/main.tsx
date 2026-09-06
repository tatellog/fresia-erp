import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import { initDb } from './data/init'
import { initTheme } from './hooks/useTheme'
import { startSync } from './services/sync/engine'
import { startAutoUpdate } from './services/updates'

startAutoUpdate()

const root = document.getElementById('root')!

/**
 * En el mostrador una pantalla en blanco no se puede diagnosticar: si la base
 * local no abre, se dice qué pasó y se ofrece reintentar.
 */
function pantallaDeError(e: unknown) {
  const caja = document.createElement('div')
  caja.style.cssText = 'max-width:30rem;margin:18vh auto 0;padding:0 1.5rem;text-align:center;font-family:system-ui,-apple-system,sans-serif;color:#7B2D26'
  const titulo = document.createElement('h1')
  titulo.style.cssText = 'font-size:1.25rem;margin:0 0 .5rem'
  titulo.textContent = 'No se pudo abrir Frésia OS'
  const detalle = document.createElement('p')
  detalle.style.cssText = 'font-size:.95rem;line-height:1.5;opacity:.75;margin:0 0 1.5rem'
  detalle.textContent = e instanceof Error ? e.message : String(e)
  const boton = document.createElement('button')
  boton.style.cssText = 'border:0;border-radius:9999px;background:#AE3028;color:#fff;font:inherit;font-weight:600;padding:.75rem 1.75rem'
  boton.textContent = 'Reintentar'
  boton.onclick = () => location.reload()
  caja.append(titulo, detalle, boton)
  root.replaceChildren(caja)
}

async function boot() {
  try {
    await initDb()
  } catch (e) {
    console.error('[Frésia] la base local no abrió', e)
    pantallaDeError(e)
    return
  }
  // el tema es cosmético: si falla, la app abre igual
  await initTheme().catch(() => {})
  startSync()
  createRoot(root).render(
    <StrictMode>
      <HashRouter>
        <App />
      </HashRouter>
    </StrictMode>,
  )
}

void boot()
