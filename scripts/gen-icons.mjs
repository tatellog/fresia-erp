// Genera los íconos de la PWA a partir del logo circular de Fresia.
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'

const SRC = 'brand/fresia-2.png'
const CREAM = '#FDF6EE'

await mkdir('public/icons', { recursive: true })

// logo sobre fondo crema, con margen proporcional para que respire
async function icon(size, out, logoRatio = 0.86) {
  const logo = await sharp(SRC)
    .resize(Math.round(size * logoRatio), Math.round(size * logoRatio), { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer()
  await sharp({ create: { width: size, height: size, channels: 4, background: CREAM } })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(out)
}

await icon(192, 'public/icons/icon-192.png')
await icon(512, 'public/icons/icon-512.png')
await icon(512, 'public/icons/maskable-512.png', 0.62) // zona segura maskable
await icon(180, 'public/apple-touch-icon.png')
await icon(64, 'public/favicon.png')

console.log('✓ íconos generados')
