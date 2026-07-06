import { db } from './db'
import { uid } from './ids'
import type { Ingredient, Product, RecipeItem, ToppingGroup, Unit } from './types'

/**
 * Catálogo real de Frésia (menú julio 2026).
 * Los costos inician en 0 y se calculan solos con las compras
 * (promedio ponderado); los precios de venta son los del menú.
 */
export async function seed() {
  const ing = (name: string, unit: Unit, minStock: number, topping?: { groups: ToppingGroup[]; portion: number }): Ingredient =>
    ({ id: uid(), name, unit, stock: 0, cost: 0, minStock, toppingGroups: topping?.groups, portion: topping?.portion })

  // ── Insumos base ──
  const fresa = ing('Fresa', 'g', 3000)
  const crema = ing('Crema tradicional', 'ml', 2000)
  const yogurt = ing('Yogurt griego', 'ml', 2000)
  const vasoCh = ing('Vaso chico 350 ml', 'pza', 25)
  const vasoMd = ing('Vaso mediano 500 ml', 'pza', 25)
  const vasoGd = ing('Vaso grande 700 ml', 'pza', 25)
  const cuchara = ing('Cuchara', 'pza', 50)
  const botellaAgua = ing('Agua del día (botella)', 'pza', 12)
  const cafeFrio = ing('Café frío (preparado)', 'pza', 10)
  const miel = ing('Miel de abeja natural', 'ml', 300)
  const frutaTemp = ing('Fruta de temporada', 'g', 500)

  // ── Toppings Clásicos ──
  const cl = (groups: ToppingGroup[] = ['clasica']) => groups
  const granolaArt = ing('Granola artesanal', 'g', 500, { groups: cl(), portion: 25 })
  const cajeta = ing('Cajeta', 'ml', 300, { groups: cl(), portion: 20 })
  const chocolate = ing('Chocolate', 'ml', 300, { groups: cl(), portion: 20 })
  const lechera = ing('Lechera', 'ml', 300, { groups: cl(), portion: 20 })
  const chocoChips = ing('Chispas de chocolate', 'g', 300, { groups: cl(), portion: 15 })
  const lotus = ing('Galleta Lotus', 'g', 300, { groups: cl(), portion: 15 })
  const oreo = ing('Oreo triturada', 'g', 300, { groups: cl(), portion: 15 })
  const brownie = ing('Brownie', 'g', 300, { groups: cl(), portion: 20 })
  const galletaMaria = ing('Galleta María', 'g', 300, { groups: cl(), portion: 15 })

  // compartidos entre Clásica y Balance
  const coco = ing('Coco rallado', 'g', 250, { groups: ['clasica', 'balance'], portion: 10 })
  const almendra = ing('Almendra fileteada', 'g', 250, { groups: ['clasica', 'balance'], portion: 12 })
  const nuez = ing('Nuez picada', 'g', 250, { groups: ['clasica', 'balance'], portion: 12 })

  // ── Toppings Balance ──
  const ba = (): ToppingGroup[] => ['balance']
  const granolaProt = ing('Granola proteica', 'g', 500, { groups: ba(), portion: 25 })
  const chia = ing('Chía', 'g', 200, { groups: ba(), portion: 10 })
  const amaranto = ing('Amaranto inflado', 'g', 200, { groups: ba(), portion: 10 })
  const pistache = ing('Pistache', 'g', 200, { groups: ba(), portion: 12 })
  const cacaoNibs = ing('Cacao nibs', 'g', 200, { groups: ba(), portion: 10 })
  const semCalabaza = ing('Semillas de calabaza', 'g', 200, { groups: ba(), portion: 12 })
  const linaza = ing('Linaza molida', 'g', 200, { groups: ba(), portion: 10 })
  const tahini = ing('Tahini', 'ml', 200, { groups: ba(), portion: 15 })
  const proteina = ing('Proteína natural', 'g', 500, { groups: ba(), portion: 10 })

  const ingredients = [
    fresa, crema, yogurt, vasoCh, vasoMd, vasoGd, cuchara, botellaAgua, cafeFrio, miel, frutaTemp,
    granolaArt, cajeta, chocolate, lechera, chocoChips, lotus, oreo, brownie, galletaMaria,
    coco, almendra, nuez,
    granolaProt, chia, amaranto, pistache, cacaoNibs, semCalabaza, linaza, tahini, proteina,
  ]

  // ── Productos ──
  let sortSeq = 0
  const prod = (name: string, emoji: string, price: number, recipe: RecipeItem[], toppingGroup?: ToppingGroup): Product =>
    ({ id: uid(), name, emoji, price, recipe, active: true, sort: ++sortSeq, toppingGroup })

  const r = (i: Ingredient, qty: number): RecipeItem => ({ ingredientId: i.id, qty })

  // recetas base por tamaño: fresa (g), crema o yogurt (ml), vaso y cuchara
  const clasica = (vaso: Ingredient, fresaG: number, cremaMl: number) =>
    [r(fresa, fresaG), r(crema, cremaMl), r(vaso, 1), r(cuchara, 1)]
  const balance = (vaso: Ingredient, fresaG: number, yogurtMl: number) =>
    [r(fresa, fresaG), r(yogurt, yogurtMl), r(proteina, 20), r(vaso, 1), r(cuchara, 1)]

  const products = [
    prod('Clásica · Chica 350 ml', '🍓', 79, clasica(vasoCh, 170, 140), 'clasica'),
    prod('Clásica · Mediana 500 ml', '🍓', 99, clasica(vasoMd, 250, 200), 'clasica'),
    prod('Clásica · Grande 700 ml', '🍓', 129, clasica(vasoGd, 350, 280), 'clasica'),
    prod('Balance · Chica 350 ml', '🌿', 89, balance(vasoCh, 170, 140), 'balance'),
    prod('Balance · Mediana 500 ml', '🌿', 109, balance(vasoMd, 250, 200), 'balance'),
    prod('Balance · Grande 700 ml', '🌿', 139, balance(vasoGd, 350, 280), 'balance'),
    prod('Combo Clásico (mediana + agua)', '🎀', 109, [...clasica(vasoMd, 250, 200), r(botellaAgua, 1)], 'clasica'),
    prod('Combo Balance (mediana + agua)', '🎀', 119, [...balance(vasoMd, 250, 200), r(botellaAgua, 1)], 'balance'),
    prod('Agua del día', '💧', 25, [r(botellaAgua, 1)]),
    prod('Café frío', '☕', 45, [r(cafeFrio, 1)]),
    prod('Fresa extra', '🍓', 20, [r(fresa, 60)]),
    prod('Extra crema', '🍦', 15, [r(crema, 60)]),
    prod('Extra granola', '🥣', 15, [r(granolaArt, 30)]),
    prod('Extra chocolate', '🍫', 15, [r(chocolate, 30)]),
    prod('Miel de abeja natural', '🍯', 15, [r(miel, 20)]),
    prod('Extra yogurt griego', '🥛', 15, [r(yogurt, 60)]),
    prod('Extra proteína (10 g)', '💪', 15, [r(proteina, 10)]),
    prod('Fruta extra de temporada', '🍇', 20, [r(frutaTemp, 60)]),
  ]

  await db.transaction('rw', [db.ingredients, db.products], async () => {
    await db.ingredients.bulkAdd(ingredients)
    await db.products.bulkAdd(products)
  })
}
