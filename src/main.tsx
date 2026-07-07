import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './App'
import { initDb } from './data/init'
import { initTheme } from './hooks/useTheme'
import { startSync } from './services/sync/engine'

initDb().then(async () => {
  await initTheme()
  startSync()
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <HashRouter>
        <App />
      </HashRouter>
    </StrictMode>,
  )
})
