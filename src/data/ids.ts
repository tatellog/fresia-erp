/** identificador universal generado en el dispositivo (seguro entre sucursales) */
export const uid = () => crypto.randomUUID()

/** FNV-1a de 32 bits con base distinta por vuelta, para armar 128 bits */
const fnv = (s: string, seed: number) => {
  let h = (0x811c9dc5 ^ seed) >>> 0
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193) >>> 0
  }
  return h
}

/**
 * Identificador estable con forma de UUID a partir de una llave: la misma
 * llave da el mismo id en cualquier dispositivo. Así el catálogo sembrado
 * tiene los mismos ids en todos lados y la nube lo funde en una sola copia
 * en vez de acumular una por dispositivo.
 */
export function stableId(key: string): string {
  const hex = [0, 1, 2, 3].map(n => fnv(key, n * 0x9e3779b9).toString(16).padStart(8, '0')).join('')
  // nibble de versión 4 y variante 8 para que Postgres lo acepte como uuid
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`
}
