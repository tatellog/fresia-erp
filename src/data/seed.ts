import { db } from './db'
import { uid } from './ids'
import type { Ingredient, Product, RecipeItem, Unit } from './types'

/** catálogo inicial de ejemplo para una instalación nueva */
export async function seed() {
  const ing = (name: string, unit: Unit, cost: number, minStock: number): Ingredient =>
    ({ id: uid(), name, unit, stock: 0, cost, minStock })

  const fresa = ing('Fresa', 'g', 0.09, 3000)
  const crema = ing('Crema base', 'ml', 0.06, 2000)
  const lechera = ing('Lechera', 'ml', 0.05, 1000)
  const vasoCh = ing('Vaso chico', 'pza', 3.5, 30)
  const vasoMd = ing('Vaso mediano', 'pza', 4.5, 30)
  const vasoGd = ing('Vaso grande', 'pza', 5.5, 30)
  const cuchara = ing('Cuchara', 'pza', 0.5, 50)
  const bombon = ing('Bombón', 'pza', 1.2, 40)
  const choco = ing('Chocolate líquido', 'ml', 0.12, 500)

  const prod = (name: string, emoji: string, price: number, recipe: RecipeItem[], sort: number): Product =>
    ({ id: uid(), name, emoji, price, recipe, active: true, sort })

  await db.transaction('rw', [db.ingredients, db.products], async () => {
    await db.ingredients.bulkAdd([fresa, crema, lechera, vasoCh, vasoMd, vasoGd, cuchara, bombon, choco])
    await db.products.bulkAdd([
      prod('Fresas con crema — Chica', '🍓', 75, [
        { ingredientId: fresa.id, qty: 150 }, { ingredientId: crema.id, qty: 100 }, { ingredientId: lechera.id, qty: 30 },
        { ingredientId: vasoCh.id, qty: 1 }, { ingredientId: cuchara.id, qty: 1 },
      ], 1),
      prod('Fresas con crema — Mediana', '🍓', 95, [
        { ingredientId: fresa.id, qty: 220 }, { ingredientId: crema.id, qty: 150 }, { ingredientId: lechera.id, qty: 45 },
        { ingredientId: vasoMd.id, qty: 1 }, { ingredientId: cuchara.id, qty: 1 },
      ], 2),
      prod('Fresas con crema — Grande', '🍓', 120, [
        { ingredientId: fresa.id, qty: 300 }, { ingredientId: crema.id, qty: 200 }, { ingredientId: lechera.id, qty: 60 },
        { ingredientId: vasoGd.id, qty: 1 }, { ingredientId: cuchara.id, qty: 1 },
      ], 3),
      prod('Extra bombones', '🍡', 15, [{ ingredientId: bombon.id, qty: 4 }], 4),
      prod('Extra chocolate', '🍫', 12, [{ ingredientId: choco.id, qty: 40 }], 5),
    ])
  })
}
