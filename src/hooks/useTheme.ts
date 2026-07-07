import { db } from '../data/db'

export type ThemePref = 'claro' | 'oscuro' | 'auto'

const mq = () => window.matchMedia('(prefers-color-scheme: dark)')

function apply(pref: ThemePref) {
  const dark = pref === 'oscuro' || (pref === 'auto' && mq().matches)
  document.documentElement.classList.toggle('dark', dark)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', dark ? '#171009' : '#AE3028')
}

export async function getThemePref(): Promise<ThemePref> {
  return ((await db.meta.get('theme'))?.value as ThemePref) ?? 'auto'
}

export async function setThemePref(pref: ThemePref) {
  await db.meta.put({ key: 'theme', value: pref })
  apply(pref)
}

/** aplica el tema guardado y sigue al sistema cuando está en automático */
export async function initTheme() {
  apply(await getThemePref())
  mq().addEventListener('change', async () => apply(await getThemePref()))
}
