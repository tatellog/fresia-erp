import type { Product } from '../data/types'
import { productLine } from './catalog'

/**
 * Fotos reales del menú (public/images, precacheadas por la PWA).
 * Se resuelven por nombre para funcionar aunque el catálogo local
 * venga de una versión anterior o el nombre se edite ligeramente.
 */

export const strip = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')

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
  // 'mermelada de fresa' va antes que 'fresa' para no confundirse con la fresa fresca
  ['mermelada de fresa', '/images/topping-mermelada-fresa.jpg'],
  ['zarzamora', '/images/topping-mermelada-zarzamora.jpg'],
  ['fresa', '/images/topping-fresa.jpg'],
]

export function toppingPhoto(name: string): string | undefined {
  const n = strip(name)
  return toppingPhotos.find(([k]) => n.includes(k))?.[1]
}

/** ilustraciones botánicas de cada mezcla de té */
const teaPhotos: [keyword: string, src: string][] = [
  ['relajante', '/images/te-relajante.jpg'],
  ['frutal', '/images/te-frutal.jpg'],
  ['fresco', '/images/te-fresco.jpg'],
  ['detox', '/images/te-detox.jpg'],
]

const productSize = (p: Product) =>
  /Grande/i.test(p.name) ? 'grande' : /Median/i.test(p.name) ? 'mediano' : 'chico'

/** foto del producto: la subida por la usuaria o, si no hay, la del menú según su línea */
export function productPhoto(p: Product): string | undefined {
  if (p.photo) return p.photo
  switch (productLine(p)) {
    case 'nogada': return '/images/nogada.jpg'
    case 'uvas': return '/images/uvas.jpg'
    case 'mix': return '/images/mix.jpg'
    case 'brulee': return '/images/brulee.jpg'
    // el Turín va solo con chocolate; la Choco Crema tiene foto por tamaño
    case 'chocolate': return strip(p.name).includes('turin')
      ? '/images/chocolate-turin.jpg'
      : `/images/chocolate-${productSize(p)}.jpg`
    case 'balance': return '/images/balance.jpg'
    case 'clasica': return productSize(p) === 'grande' ? '/images/clasica-grande.jpg' : '/images/clasica.jpg'
    case 'waffle': return '/images/waffle.jpg'
    case 'bebidas': {
      const n = strip(p.name)
      if (n.startsWith('agua')) return '/images/agua.jpg'
      return teaPhotos.find(([k]) => n.includes(k))?.[1]
    }
    case 'despensa': {
      const n = strip(p.name)
      if (n.startsWith('pepita')) return '/images/pepitas.jpg'
      if (!n.startsWith('miel')) return undefined
      return n.includes('500') ? '/images/miel-500.jpg' : '/images/miel-70.jpg'
    }
    default: return undefined
  }
}
