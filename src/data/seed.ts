import { db } from './db'
import { uid } from './ids'
import type { Ingredient, Line, Product, RecipeItem, ToppingGroup, Unit } from './types'

/**
 * Catálogo oficial de Frèsia (menú v4, septiembre 2026): la Frésia del mes
 * (Frésia en Nogada, edición limitada), seis experiencias en vaso (Clásica,
 * Uvas, Mix Frésia, Balance, Chocolate y Frèsia Brûlée), el Waffle Frésia,
 * bebidas (tés orgánicos y agua) y despensa (miel artesanal y pepitas).
 * Lista única de toppings para todas las líneas: 2 incluidos, adicionales
 * con cargo y premium siempre con cargo. Los costos inician en 0 y se
 * calculan con las compras.
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
  // la fresa también se ofrece como topping premium ("Fresas" en la carta)
  const fresa = ing('Fresa fresca', 'g', 3000, { portion: 40, premium: 25 })
  const uva = ing('Uva verde', 'g', 2000)
  const crema = ing('Crema tradicional', 'ml', 2000)
  const yogurt = ing('Yogurt griego', 'ml', 2000)
  const azucarBrulee = ing('Azúcar para brûlée', 'g', 300)
  const waffle = ing('Waffle', 'pza', 10)

  // ── Frésia del mes: Nogada ──
  const nuezCastilla = ing('Nuez de Castilla', 'g', 300)
  const granada = ing('Granada desgranada', 'g', 500)

  // ── Empaque ──
  const vaso12 = ing('Vaso PET 12 oz', 'pza', 25)
  const vaso16 = ing('Vaso PET 16 oz', 'pza', 25)
  const vaso20 = ing('Vaso PET 20 oz', 'pza', 25)
  const tapaPlana = ing('Tapa plana', 'pza', 50)
  const tapaDomo = ing('Tapa domo', 'pza', 50)
  const cuchara = ing('Cuchara', 'pza', 50)
  const servilleta = ing('Servilleta', 'pza', 100)
  const sticker = ing('Sticker / sello Frésia', 'pza', 100)

  // ── Toppings incluidos (lista única para todas las experiencias) ──
  const granolaArt = ing('Granola artesanal', 'g', 500, { portion: 25 })
  const cajeta = ing('Cajeta', 'ml', 300, { portion: 20 })
  const nuez = ing('Nuez picada', 'g', 250, { portion: 12 })
  const coco = ing('Coco rallado', 'g', 250, { portion: 10 })
  const almendra = ing('Almendra fileteada', 'g', 250, { portion: 12 })
  const oreo = ing('Oreo triturada', 'g', 300, { portion: 15 })
  const mazapan = ing('Mazapán', 'g', 300, { portion: 15 })
  const arandano = ing('Arándano', 'g', 250, { portion: 15 })
  // ── Toppings premium (+$25, no gastan un incluido) ──
  const chocoTurin = ing('Chocolate Turín', 'g', 400, { portion: 15, premium: 25 })
  const pistache = ing('Pistache', 'g', 200, { portion: 12, premium: 25 })
  const lotus = ing('Lotus', 'g', 250, { portion: 15, premium: 25 })
  const mermeladaFresa = ing('Mermelada de fresa', 'g', 300, { portion: 25, premium: 25 })
  const mermeladaZarzamora = ing('Mermelada de zarzamora', 'g', 300, { portion: 25, premium: 25 })

  // ── Bebidas y despensa (se venden por pieza) ──
  const teRelajante = ing('Té Relajante (manzanilla y flor de manzano)', 'pza', 10)
  const teFrutal = ing('Té Frutal (frutas y flores)', 'pza', 10)
  const teFresco = ing('Té Fresco (menta y hierbas)', 'pza', 10)
  const teDetox = ing('Té Detox (verde, hierbas y cítricos)', 'pza', 10)
  const agua = ing('Agua Santa María 1 L', 'pza', 12)
  const miel500 = ing('Miel artesanal 500 g', 'pza', 3)
  const miel70 = ing('Miel artesanal 70 g', 'pza', 6)
  const pepitas = ing('Pepitas 70 g', 'pza', 6)

  const ingredients = [
    fresa, uva, crema, yogurt, azucarBrulee, waffle, nuezCastilla, granada,
    vaso12, vaso16, vaso20, tapaPlana, tapaDomo, cuchara, servilleta, sticker,
    granolaArt, cajeta, nuez, coco, almendra, oreo, mazapan, arandano,
    chocoTurin, pistache, lotus, mermeladaFresa, mermeladaZarzamora,
    teRelajante, teFrutal, teFresco, teDetox, agua, miel500, miel70, pepitas,
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
    nuezG: number
    granadaG: number
  }
  const sizes: Size[] = [
    { label: 'Chico', oz: '12 oz', vaso: vaso12, tapa: tapaPlana, fresaG: 170, baseMl: 140, chocoG: 40, azucarG: 12, nuezG: 15, granadaG: 25 },
    { label: 'Mediano', oz: '16 oz', vaso: vaso16, tapa: tapaDomo, fresaG: 240, baseMl: 190, chocoG: 50, azucarG: 15, nuezG: 20, granadaG: 30 },
    { label: 'Grande', oz: '20 oz', vaso: vaso20, tapa: tapaDomo, fresaG: 300, baseMl: 240, chocoG: 60, azucarG: 20, nuezG: 25, granadaG: 40 },
  ]

  /** vaso de línea con 2 toppings incluidos; `fruta` reparte la fruta base entre uno o dos ingredientes */
  const vasoProd = (linePrefix: string, line: Line, emoji: string, s: Size, price: number, extraRecipe: RecipeItem[], fruta: Ingredient[] = [fresa]): Product => ({
    id: uid(),
    name: `${linePrefix} · ${s.label} ${s.oz}`,
    emoji,
    price,
    recipe: [...fruta.map(f => r(f, Math.round(s.fresaG / fruta.length))), ...extraRecipe, ...empaque(s.vaso, s.tapa)],
    active: true,
    sort: ++sortSeq,
    toppingGroup: 'clasica',
    line,
  })

  /** la Frésia del mes: la nuez de Castilla ya va en la receta y ocupa un incluido, así que se elige 1 topping más */
  const vasoDelMes = (linePrefix: string, line: Line, emoji: string, s: Size, price: number, recipe: RecipeItem[]): Product => ({
    id: uid(),
    name: `${linePrefix} · ${s.label} ${s.oz}`,
    emoji,
    price,
    recipe: [...recipe, ...empaque(s.vaso, s.tapa)],
    active: true,
    sort: ++sortSeq,
    toppingGroup: 'clasica',
    includedToppings: 1,
    line,
  })

  /** producto que se vende por pieza (bebidas y despensa): un insumo, sin toppings */
  const pieza = (name: string, line: Line, emoji: string, price: number, insumo: Ingredient): Product => ({
    id: uid(),
    name,
    emoji,
    price,
    recipe: [r(insumo, 1)],
    active: true,
    sort: ++sortSeq,
    line,
  })

  const clasicaPrices = [95, 115, 135]
  const uvasPrices = [105, 125, 145]
  const mixPrices = [115, 135, 155]
  const balancePrices = [105, 125, 145]
  const chocoPrices = [115, 135, 155]
  /** Frèsia Brûlée: solo Mediano y Grande, caramelizada al momento, 2 toppings incluidos */
  const bruleePrices: Record<string, number> = { Mediano: 135, Grande: 155 }
  /** Frésia del mes (septiembre): Frésia en Nogada, solo Mediano y Grande */
  const nogadaPrices: Record<string, number> = { Mediano: 145, Grande: 165 }
  const TE_PRICE = 35

  const products: Product[] = [
    // ── Frésia del mes: edición limitada de septiembre ──
    ...sizes.filter(s => s.label in nogadaPrices).map(s =>
      vasoDelMes('Frésia en Nogada', 'nogada', '🍓', s, nogadaPrices[s.label],
        [r(fresa, s.fresaG), r(crema, s.baseMl), r(nuezCastilla, s.nuezG), r(granada, s.granadaG)])),
    ...sizes.map((s, i) => vasoProd('Clásica', 'clasica', '🍓', s, clasicaPrices[i], [r(crema, s.baseMl)])),
    // Uvas: uva verde + crema
    ...sizes.map((s, i) => vasoProd('Uvas', 'uvas', '🍇', s, uvasPrices[i], [r(crema, s.baseMl)], [uva])),
    // Mix Frésia: uva verde + fresa + crema
    ...sizes.map((s, i) => vasoProd('Mix Frésia', 'mix', '🍇', s, mixPrices[i], [r(crema, s.baseMl)], [fresa, uva])),
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
    // ── Waffle Frésia: waffle + crema y 2 toppings incluidos ──
    {
      id: uid(),
      name: 'Waffle Frésia',
      emoji: '🧇',
      price: 99,
      recipe: [r(waffle, 1), r(crema, 100), r(servilleta, 1)],
      active: true,
      sort: ++sortSeq,
      toppingGroup: 'clasica',
      line: 'waffle',
    },
    // ── Bebidas ──
    pieza('Té Relajante', 'bebidas', '🍵', TE_PRICE, teRelajante),
    pieza('Té Frutal', 'bebidas', '🍵', TE_PRICE, teFrutal),
    pieza('Té Fresco', 'bebidas', '🍵', TE_PRICE, teFresco),
    pieza('Té Detox', 'bebidas', '🍵', TE_PRICE, teDetox),
    pieza('Agua Santa María (1 L)', 'bebidas', '💧', 25, agua),
    // ── Despensa ──
    pieza('Miel artesanal (500 g)', 'despensa', '🍯', 270, miel500),
    pieza('Miel artesanal (70 g)', 'despensa', '🍯', 65, miel70),
    pieza('Pepitas (70 g)', 'despensa', '🌱', 25, pepitas),
  ]

  await db.transaction('rw', [db.ingredients, db.products], async () => {
    await db.ingredients.bulkAdd(ingredients)
    await db.products.bulkAdd(products)
  })
}
