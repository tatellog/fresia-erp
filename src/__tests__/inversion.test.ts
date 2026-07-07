import { describe, expect, it } from 'vitest'
import type { Investment } from '../data/types'
import { investorShares } from '../services/investments'

const inv = (concept: string, amount: number, paidBy: string, pending = 0): Investment =>
  ({ id: concept, ts: 0, concept, amount, paidBy, pending })

describe('aportaciones de inversión', () => {
  it('reparte gastos compartidos en partes iguales sobre lo ya pagado', () => {
    const data = [
      inv('Renta', 32000, 'TMA', 10000),   // pagado 22000 → 7333.33 c/u
      inv('Batidora', 3000, 'A'),
      inv('Espejo', 1500, 'T'),
      inv('Insumos', 10000, ''),            // sin asignar
      inv('Leds', 5400, 'T', 2700),         // pagado 2700 → T
    ]
    const s = investorShares(data)
    expect(s.T).toBeCloseTo(22000 / 3 + 1500 + 2700, 1)
    expect(s.A).toBeCloseTo(22000 / 3 + 3000, 1)
    expect(s.M).toBeCloseTo(22000 / 3, 1)
    expect(s.sin).toBe(10000)
    // la suma de aportaciones es el total pagado
    const totalPagado = data.reduce((x, i) => x + i.amount - i.pending, 0)
    expect(s.T + s.A + s.M + s.sin).toBeCloseTo(totalPagado, 1)
  })
})
