import { db } from './db'
import { uid } from './ids'
import type { Ingredient, Line, Product, RecipeItem, ToppingGroup, Unit } from './types'

/**
 * Catálogo oficial de Frésia (menú v2, julio 2026): tres líneas
 * (Clásica, con Chocolate y Balance), cuatro tamaños, 2 toppings
 * incluidos por vaso y extras con reglas por línea. Sin bebidas.
 * Los costos inician en 0 y se calculan solos con las compras.
 */
export async function seed() {
  const ing = (name: string, unit: Unit, minStock: number, topping?: { groups: ToppingGroup[]; portion: number }): Ingredient =>
    ({ id: uid(), name, unit, stock: 0, cost: 0, minStock, toppingGroups: topping?.groups, portion: topping?.portion })

  // ── Bases ──
  const fresa = ing('Fresa fresca', 'g', 3000)
  const crema = ing('Crema tradicional', 'ml', 2000)
  const yogurt = ing('Yogurt griego', 'ml', 2000)
  const proteina = ing('Proteína en polvo', 'g', 500)
  const salsaChoco = ing('Salsa de chocolate', 'ml', 500)

  // ── Empaque ──
  const vaso250 = ing('Vaso PET 250 ml', 'pza', 25)
  const vaso350 = ing('Vaso PET 350 ml', 'pza', 25)
  const vaso500 = ing('Vaso PET 500 ml', 'pza', 25)
  const vaso700 = ing('Vaso PET 700 ml', 'pza', 25)
  const tapaPlana = ing('Tapa plana', 'pza', 50)
  const tapaDomo = ing('Tapa domo', 'pza', 50)
  const cuchara = ing('Cuchara', 'pza', 50)
  const servilleta = ing('Servilleta', 'pza', 100)
  const sticker = ing('Sticker / sello Frésia', 'pza', 100)

  // ── Toppings clásicos (los usa también la línea con Chocolate) ──
  const cl: ToppingGroup[] = ['clasica']
  const ambos: ToppingGroup[] = ['clasica', 'balance']
  const granolaArt = ing('Granola artesanal', 'g', 500, { groups: cl, portion: 25 })
  const cajeta = ing('Cajeta', 'ml', 300, { groups: cl, portion: 20 })
  const chocolate = ing('Chocolate', 'ml', 300, { groups: cl, portion: 20 })
  const lechera = ing('Lechera', 'ml', 300, { groups: cl, portion: 20 })
  const chocoChips = ing('Chocolate chips', 'g', 300, { groups: cl, portion: 15 })
  const oreo = ing('Oreo triturada', 'g', 300, { groups: cl, portion: 15 })
  const cocoRallado = ing('Coco rallado', 'g', 250, { groups: cl, portion: 10 })
  const almendra = ing('Almendra fileteada', 'g', 250, { groups: ambos, portion: 12 })
  const nuez = ing('Nuez picada', 'g', 250, { groups: ambos, portion: 12 })

  // ── Toppings Balance ──
  const ba: ToppingGroup[] = ['balance']
  const granolaProt = ing('Granola proteica', 'g', 500, { groups: ba, portion: 25 })
  const chia = ing('Chía', 'g', 200, { groups: ba, portion: 10 })
  const amaranto = ing('Amaranto inflado', 'g', 200, { groups: ba, portion: 10 })
  const pistache = ing('Pistache', 'g', 200, { groups: ba, portion: 12 })
  const cocoSinAzucar = ing('Coco sin azúcar', 'g', 250, { groups: ba, portion: 10 })
  const cacaoNibs = ing('Cacao nibs', 'g', 200, { groups: ba, portion: 10 })

  const ingredients = [
    fresa, crema, yogurt, proteina, salsaChoco,
    vaso250, vaso350, vaso500, vaso700, tapaPlana, tapaDomo, cuchara, servilleta, sticker,
    granolaArt, cajeta, chocolate, lechera, chocoChips, oreo, cocoRallado, almendra, nuez,
    granolaProt, chia, amaranto, pistache, cocoSinAzucar, cacaoNibs,
  ]

  // ── Productos ──
  let sortSeq = 0
  const r = (i: Ingredient, qty: number): RecipeItem => ({ ingredientId: i.id, qty })

  /** empaque por tamaño: vaso + tapa (plana en chicos, domo en grandes) + cuchara, servilleta y sello */
  const empaque = (vaso: Ingredient, tapa: Ingredient) =>
    [r(vaso, 1), r(tapa, 1), r(cuchara, 1), r(servilleta, 1), r(sticker, 1)]

  interface Size {
    label: string
    ml: string
    vaso: Ingredient
    tapa: Ingredient
    fresaG: number
    baseMl: number
    salsaMl: number
  }
  const sizes: Size[] = [
    { label: 'Mini', ml: '250 ml', vaso: vaso250, tapa: tapaPlana, fresaG: 120, baseMl: 100, salsaMl: 30 },
    { label: 'Chica', ml: '350 ml', vaso: vaso350, tapa: tapaPlana, fresaG: 170, baseMl: 140, salsaMl: 40 },
    { label: 'Mediana', ml: '500 ml', vaso: vaso500, tapa: tapaDomo, fresaG: 250, baseMl: 200, salsaMl: 50 },
    { label: 'Grande', ml: '700 ml', vaso: vaso700, tapa: tapaDomo, fresaG: 350, baseMl: 280, salsaMl: 60 },
  ]

  const vasoProd = (linePrefix: string, line: Line, toppingGroup: ToppingGroup, emoji: string, s: Size, price: number, extraRecipe: RecipeItem[] = []): Product => ({
    id: uid(),
    name: `${linePrefix} · ${s.label} ${s.ml}`,
    emoji,
    price,
    recipe: [r(fresa, s.fresaG), ...extraRecipe, ...empaque(s.vaso, s.tapa)],
    active: true,
    sort: ++sortSeq,
    toppingGroup,
    line,
  })

  const clasicaPrices = [69, 89, 109, 139]
  const chocoPrices = [79, 99, 119, 149]
  const balancePrices = [85, 105, 125, 155]

  const products: Product[] = [
    ...sizes.map((s, i) => vasoProd('Clásica', 'clasica', 'clasica', '🍓', s, clasicaPrices[i], [r(crema, s.baseMl)])),
    ...sizes.map((s, i) => vasoProd('Chocolate', 'chocolate', 'clasica', '🍫', s, chocoPrices[i], [r(crema, s.baseMl), r(salsaChoco, s.salsaMl)])),
    ...sizes.map((s, i) => vasoProd('Balance', 'balance', 'balance', '🌿', s, balancePrices[i], [r(yogurt, s.baseMl), r(proteina, 20)])),
  ]

  const todas: Line[] = ['clasica', 'chocolate', 'balance']
  const extra = (name: string, emoji: string, price: number, recipe: RecipeItem[], scope: Line[]): Product =>
    ({ id: uid(), name, emoji, price, recipe, active: true, sort: ++sortSeq, extraScope: scope })

  products.push(
    extra('Fresa extra', '🍓', 20, [r(fresa, 60)], todas),
    extra('Extra crema', '🍦', 15, [r(crema, 60)], ['clasica', 'chocolate']),
    extra('Extra granola', '🥣', 15, [r(granolaArt, 30)], todas),
    extra('Extra chocolate', '🍫', 15, [r(salsaChoco, 30)], todas),
    extra('Extra yogurt griego', '🥛', 20, [r(yogurt, 60)], ['balance']),
    extra('Extra proteína 10 g', '💪', 20, [r(proteina, 10)], ['balance']),
  )

  await db.transaction('rw', [db.ingredients, db.products], async () => {
    await db.ingredients.bulkAdd(ingredients)
    await db.products.bulkAdd(products)
  })
}
