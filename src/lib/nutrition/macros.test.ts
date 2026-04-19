import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import {
  CAL_FLOOR,
  MacrosInfeasibleError,
  calculateBmr,
  calculateMacros,
  calculateTargetKcal,
  calculateTdee,
  weeklyMacros,
} from './macros'

describe('calculateBmr (Mifflin-St Jeor)', () => {
  it('matches the worked example from the spec (owner: 34M, 183cm, 101kg)', () => {
    // BMR = 10(101) + 6.25(183) - 5(34) + 5 = 1010 + 1143.75 - 170 + 5 = 1988.75
    expect(calculateBmr({ sex: 'male', weightKg: 101, heightCm: 183, age: 34 })).toBe(1989)
  })

  it('applies the -161 offset for women', () => {
    // BMR = 10(65) + 6.25(165) - 5(30) - 161 = 650 + 1031.25 - 150 - 161 = 1370.25
    expect(calculateBmr({ sex: 'female', weightKg: 65, heightCm: 165, age: 30 })).toBe(1370)
  })

  it('scales sensibly across a body-weight sweep', () => {
    const light = calculateBmr({ sex: 'male', weightKg: 60, heightCm: 170, age: 30 })
    const heavy = calculateBmr({ sex: 'male', weightKg: 100, heightCm: 170, age: 30 })
    expect(heavy).toBeGreaterThan(light)
    expect(heavy - light).toBeCloseTo(400, 0) // 10 kcal/kg · 40 kg delta
  })

  it('rejects non-positive inputs', () => {
    expect(() => calculateBmr({ sex: 'male', weightKg: 0, heightCm: 180, age: 30 })).toThrow()
    expect(() => calculateBmr({ sex: 'male', weightKg: 80, heightCm: -1, age: 30 })).toThrow()
    expect(() => calculateBmr({ sex: 'male', weightKg: 80, heightCm: 180, age: NaN })).toThrow()
  })
})

describe('calculateTdee', () => {
  const bmr = 1989

  it.each([
    ['sedentary', 2387], // 1989 * 1.2
    ['light', 2735], // 1989 * 1.375
    ['moderate', 3083], // 1989 * 1.55
    ['active', 3431], // 1989 * 1.725
    ['very_active', 3779], // 1989 * 1.9
  ] as const)('applies the %s multiplier', (level, expected) => {
    expect(calculateTdee(bmr, level)).toBe(expected)
  })
})

describe('calculateTargetKcal', () => {
  const tdee = 3083 // owner

  it('applies phase deficits per nutrition-spec §1 step 3', () => {
    expect(calculateTargetKcal(tdee, 'foundation')).toEqual({ kcal: 2583, flaggedFloor: false })
    expect(calculateTargetKcal(tdee, 'build')).toEqual({ kcal: 2433, flaggedFloor: false })
    expect(calculateTargetKcal(tdee, 'reveal')).toEqual({ kcal: 2333, flaggedFloor: false })
    expect(calculateTargetKcal(tdee, 'peak')).toEqual({ kcal: 3083, flaggedFloor: false })
  })

  it('never returns below the 1900 kcal floor', () => {
    // A small person on a sedentary multiplier in reveal phase would dip below
    const smallTdee = 2000
    const { kcal, flaggedFloor } = calculateTargetKcal(smallTdee, 'reveal')
    expect(kcal).toBe(CAL_FLOOR)
    expect(flaggedFloor).toBe(true)
  })

  it('flags the floor only when triggered', () => {
    expect(calculateTargetKcal(tdee, 'reveal').flaggedFloor).toBe(false)
    expect(calculateTargetKcal(2000, 'reveal').flaggedFloor).toBe(true)
  })
})

describe('calculateMacros', () => {
  it('owner phase-1 example from the spec', () => {
    const macros = calculateMacros(2583, 101)
    // protein = 101 * 2.0 = 202 g (808 kcal)
    // fat floor = max(101 * 0.8 * 9, 2583 * 0.25) = max(727.2, 645.75) = 727.2 → 81 g (729 kcal)
    // carbs = (2583 - 808 - 729) / 4 = 261.5 → 261 g or 262
    expect(macros.proteinG).toBe(202)
    expect(macros.fatG).toBe(81)
    expect(macros.carbsG).toBeGreaterThanOrEqual(259)
    expect(macros.carbsG).toBeLessThanOrEqual(263)
    expect(macros.kcal).toBe(2583)
  })

  // Feasibility guard for property-based tests: protein(2g/kg) + fat(0.8g/kg)
  // floors cost 15.2 kcal/kg. A 150kg user at 1900kcal floor is infeasible —
  // handled by the MacrosInfeasibleError path. For "happy path" properties we
  // constrain weight so 15.2·w < kcal_min, i.e. w < 1900/15.2 ≈ 125.
  it('always uses 2.0 g/kg protein (feasible weight range)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 45, max: 120 }),
        fc.integer({ min: CAL_FLOOR, max: 4500 }),
        (weightKg, kcal) => {
          const m = calculateMacros(kcal, weightKg)
          expect(m.proteinG).toBe(Math.round(weightKg * 2.0))
        },
      ),
    )
  })

  it('fat never below 0.8 g/kg floor (feasible weight range)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 45, max: 120 }),
        fc.integer({ min: CAL_FLOOR, max: 4500 }),
        (weightKg, kcal) => {
          const m = calculateMacros(kcal, weightKg)
          const fatFloorG = Math.round(weightKg * 0.8)
          expect(m.fatG).toBeGreaterThanOrEqual(fatFloorG - 1) // integer rounding slack
        },
      ),
    )
  })

  it('throws MacrosInfeasible past the feasibility edge (15.2 kcal/kg × weight > kcal)', () => {
    // 130kg at 1900 kcal: 130*15.2 = 1976 > 1900 → infeasible
    expect(() => calculateMacros(1900, 130)).toThrow(MacrosInfeasibleError)
    // 100kg at 1900 kcal: 100*15.2 = 1520 < 1900 → feasible
    expect(() => calculateMacros(1900, 100)).not.toThrow()
  })

  it('fat never below 25% of kcal target (applied via kcal ceiling of floor)', () => {
    fc.assert(
      fc.property(fc.integer({ min: 2100, max: 4500 }), (kcal) => {
        const m = calculateMacros(kcal, 80)
        expect(m.fatG * 9).toBeGreaterThanOrEqual(kcal * 0.24) // tight rounding tolerance
      }),
    )
  })

  it('total of protein + fat + carbs kcal ≈ target kcal (within rounding)', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 55, max: 120 }),
        fc.integer({ min: 2100, max: 4500 }),
        (weightKg, kcal) => {
          const m = calculateMacros(kcal, weightKg)
          const total = m.proteinG * 4 + m.carbsG * 4 + m.fatG * 9
          expect(Math.abs(total - kcal)).toBeLessThanOrEqual(8) // 2-gram rounding drift
        },
      ),
    )
  })

  it('throws MacrosInfeasible when protein + fat floors exceed the target', () => {
    // Very large person on a very low kcal target — unrealistic, defensive
    expect(() => calculateMacros(1000, 300)).toThrow(MacrosInfeasibleError)
  })

  it('rejects non-positive inputs', () => {
    expect(() => calculateMacros(0, 80)).toThrow()
    expect(() => calculateMacros(2500, 0)).toThrow()
  })
})

describe('weeklyMacros pipeline', () => {
  const ownerProfile = {
    sex: 'male' as const,
    age: 34,
    heightCm: 183,
    weightKg: 101,
    activity: 'moderate' as const,
    phase: 'foundation' as const,
  }

  it('owner foundation example', () => {
    const result = weeklyMacros(ownerProfile)
    expect(result.tdee).toBe(3083)
    expect(result.kcal).toBe(2583)
    expect(result.flaggedFloor).toBe(false)
    expect(result.proteinG).toBe(202)
  })

  it('reveal phase still stays above the kcal floor for the owner', () => {
    const result = weeklyMacros({ ...ownerProfile, phase: 'reveal' })
    expect(result.kcal).toBeGreaterThanOrEqual(CAL_FLOOR)
    expect(result.flaggedFloor).toBe(false)
    expect(result.kcal).toBe(2333)
  })

  it('flags floor for a small sedentary user on reveal', () => {
    const result = weeklyMacros({
      sex: 'female',
      age: 55,
      heightCm: 158,
      weightKg: 60,
      activity: 'sedentary',
      phase: 'reveal',
    })
    expect(result.kcal).toBe(CAL_FLOOR)
    expect(result.flaggedFloor).toBe(true)
  })
})
