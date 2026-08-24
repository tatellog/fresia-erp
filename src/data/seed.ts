import { db } from './db'
import { uid } from './ids'
import type { Ingredient, Line, Product, RecipeItem, ToppingGroup, Unit } from './types'

/**
 * Catálogo oficial de Frèsia (menú v3, agosto 2026): cinco experiencias
 * (Clásica, Uvas con Crema, Balance, Chocolate y Frèsia Brûlée), tres tamaños en onzas y
 * una lista única de toppings para todas las líneas: 2 incluidos,
 * adicionales con cargo y premium (Pistache, Lotus) siempre con cargo.
 * Sin extras sueltos. Los costos inician en 0 y se calculan con las compras.
 */
export async function seed() {
  const todas: ToppingGroup[] = ['clasica', 'balance']
  const ing = (name: string, unit: Unit, minStock: number, topping?: { portion: number; premium?: number }): Ingredient =>
    ({
      id: uid(), name, unit, stock: 0, cost: 0, minStock,
      toppingGroups: topping ? todas : undefined,
      portion: topping?.portion,
      premiumPrice: topping?.premium,
    })

  // ── Bases ──
  const fresa = ing('Fresa fresca', 'g', 3000)
  const uva = ing('Uva verde', 'g', 2000)
  const crema = ing('Crema tradicional', 'ml', 2000)
  const yogurt = ing('Yogurt griego', 'ml', 2000)
  const azucarBrulee = ing('Azúcar para brûlée', 'g', 300)

  // ── Empaque ──
  const vaso12 = ing('Vaso PET 12 oz', 'pza', 25)
  const vaso16 = ing('Vaso PET 16 oz', 'pza', 25)
  const vaso20 = ing('Vaso PET 20 oz', 'pza', 25)
  const tapaPlana = ing('Tapa plana', 'pza', 50)
  const tapaDomo = ing('Tapa domo', 'pza', 50)
  const cuchara = ing('Cuchara', 'pza', 50)
  const servilleta = ing('Servilleta', 'pza', 100)
  const sticker = ing('Sticker / sello Frésia', 'pza', 100)

  // ── Toppings (lista única para todas las experiencias) ──
  const granolaArt = ing('Granola artesanal', 'g', 500, { portion: 25 })
  const cajeta = ing('Cajeta', 'ml', 300, { portion: 20 })
  const chocoTurin = ing('Chocolate Turín', 'g', 400, { portion: 15 })
  const nuez = ing('Nuez picada', 'g', 250, { portion: 12 })
  const coco = ing('Coco rallado', 'g', 250, { portion: 10 })
  const almendra = ing('Almendra fileteada', 'g', 250, { portion: 12 })
  const oreo = ing('Oreo triturada', 'g', 300, { portion: 15 })
  const mazapan = ing('Mazapán', 'g', 300, { portion: 15 })
  const arandano = ing('Arándano', 'g', 250, { portion: 15 })
  const pistache = ing('Pistache', 'g', 200, { portion: 12, premium: 25 })
  const lotus = ing('Lotus', 'g', 250, { portion: 15, premium: 25 })

  const ingredients = [
    fresa, uva, crema, yogurt, azucarBrulee,
    vaso12, vaso16, vaso20, tapaPlana, tapaDomo, cuchara, servilleta, sticker,
    granolaArt, cajeta, chocoTurin, nuez, coco, almendra, oreo, mazapan, arandano, pistache, lotus,
  ]

  // ── Productos ──
  let sortSeq = 0
  const r = (i: Ingredient, qty: number): RecipeItem => ({ ingredientId: i.id, qty })

  /** empaque por tamaño: vaso + tapa (plana en chico, domo en grandes) + cuchara, servilleta y sello */
  const empaque = (vaso: Ingredient, tapa: Ingredient) =>
    [r(vaso, 1), r(tapa, 1), r(cuchara, 1), r(servilleta, 1), r(sticker, 1)]

  interface Size {
    label: string
    oz: string
    vaso: Ingredient
    tapa: Ingredient
    fresaG: number
    baseMl: number
    chocoG: number
    azucarG: number
  }
  const sizes: Size[] = [
    { label: 'Chico', oz: '12 oz', vaso: vaso12, tapa: tapaPlana, fresaG: 170, baseMl: 140, chocoG: 40, azucarG: 12 },
    { label: 'Mediano', oz: '16 oz', vaso: vaso16, tapa: tapaDomo, fresaG: 240, baseMl: 190, chocoG: 50, azucarG: 15 },
    { label: 'Grande', oz: '20 oz', vaso: vaso20, tapa: tapaDomo, fresaG: 300, baseMl: 240, chocoG: 60, azucarG: 20 },
  ]

  const vasoProd = (linePrefix: string, line: Line, emoji: string, s: Size, price: number, extraRecipe: RecipeItem[], fruta = fresa): Product => ({
    id: uid(),
    name: `${linePrefix} · ${s.label} ${s.oz}`,
    emoji,
    price,
    recipe: [r(fruta, s.fresaG), ...extraRecipe, ...empaque(s.vaso, s.tapa)],
    active: true,
    sort: ++sortSeq,
    toppingGroup: 'clasica',
    line,
  })

  const clasicaPrices = [95, 115, 135]
  const balancePrices = [105, 125, 145]
  const chocoPrices = [115, 135, 155]
  /** Frèsia Brûlée: solo Mediano y Grande, caramelizada al momento, 2 toppings incluidos */
  const bruleePrices: Record<string, number> = { Mediano: 135, Grande: 155 }

  const products: Product[] = [
    ...sizes.map((s, i) => vasoProd('Clásica', 'clasica', '🍓', s, clasicaPrices[i], [r(crema, s.baseMl)])),
    // Uvas con Crema: misma experiencia y precios que la Clásica, con uva verde
    ...sizes.map((s, i) => vasoProd('Uvas con Crema', 'uvas', '🍇', s, clasicaPrices[i], [r(crema, s.baseMl)], uva)),
    ...sizes.map((s, i) => vasoProd('Balance', 'balance', '🌿', s, balancePrices[i], [r(yogurt, s.baseMl)])),
    ...sizes.map((s, i) => vasoProd('Chocolate', 'chocolate', '🍫', s, chocoPrices[i], [r(crema, s.baseMl), r(chocoTurin, s.chocoG)])),
    ...sizes.filter(s => s.label in bruleePrices).map((s): Product => ({
      id: uid(),
      name: `Frèsia Brûlée · ${s.label} ${s.oz}`,
      emoji: '🔥',
      price: bruleePrices[s.label],
      recipe: [r(fresa, s.fresaG), r(crema, s.baseMl), r(azucarBrulee, s.azucarG), ...empaque(s.vaso, s.tapa)],
      active: true,
      sort: ++sortSeq,
      toppingGroup: 'clasica',
      line: 'brulee',
    })),
  ]

  await db.transaction('rw', [db.ingredients, db.products], async () => {
    await db.ingredients.bulkAdd(ingredients)
    await db.products.bulkAdd(products)
  })
}
