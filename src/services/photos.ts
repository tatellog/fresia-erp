import type { Product } from '../data/types'
import { productLine } from './catalog'

/**
 * Fotos reales del menú (public/images, precacheadas por la PWA).
 * Se resuelven por nombre para funcionar aunque el catálogo local
 * venga de una versión anterior o el nombre se edite ligeramente.
 */

const strip = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

const toppingPhotos: [keyword: string, src: string][] = [
  ['cajeta', '/images/topping-cajeta.jpg'],
  ['chocolate', '/images/topping-chocolate.jpg'],
  ['oreo', '/images/topping-oreo.jpg'],
  ['coco', '/images/topping-coco.jpg'],
  ['granola', '/images/topping-granola.jpg'],
  ['nuez', '/images/topping-nuez.jpg'],
  ['almendra', '/images/topping-almendra.jpg'],
  ['mazapan', '/images/topping-mazapan.jpg'],
  ['arandano', '/images/topping-arandano.jpg'],
  ['pistache', '/images/topping-pistache.jpg'],
  ['lotus', '/images/topping-lotus.jpg'],
]

export function toppingPhoto(name: string): string | undefined {
  const n = strip(name)
  return toppingPhotos.find(([k]) => n.includes(k))?.[1]
}

const productSize = (p: Product) =>
  /Grande/i.test(p.name) ? 'grande' : /Median/i.test(p.name) ? 'mediano' : 'chico'

/** foto del producto según su línea (Chocolate tiene foto por tamaño) */
export function productPhoto(p: Product): string | undefined {
  switch (productLine(p)) {
    case 'uvas': return '/images/uvas.jpg'
    case 'brulee': return '/images/brulee.jpg'
    case 'chocolate': return `/images/chocolate-${productSize(p)}.jpg`
    case 'balance': return '/images/balance.jpg'
    case 'clasica': return productSize(p) === 'grande' ? '/images/clasica-grande.jpg' : '/images/clasica.jpg'
    default: return undefined
  }
}
