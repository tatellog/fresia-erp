import type { IconName } from '../ui/icons'

/** secciones principales de la app; compartidas por la sidebar y los tabs inferiores */
export const tabs: { to: string; label: string; icon: IconName }[] = [
  { to: '/', label: 'Vender', icon: 'bag' },
  { to: '/inventario', label: 'Insumos', icon: 'box' },
  { to: '/productos', label: 'Menú', icon: 'menu' },
  { to: '/caja', label: 'Caja', icon: 'wallet' },
  { to: '/inversion', label: 'Inversión', icon: 'bank' },
  { to: '/reportes', label: 'Dashboard', icon: 'chart' },
]
