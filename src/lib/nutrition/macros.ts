import type { ActivityLevel, Sex } from '@/domain/profile'
import type { PhaseName } from '@/domain/plan'

/** Hard floor on any auto-calculated calorie target — see docs/specs/nutrition-spec.md §1. */
export const CAL_FLOOR = 1900

export type Macros = {
  kcal: number
  proteinG: number
  carbsG: number
  fatG: number
}

export type BmrInput = {
  sex: Sex
  weightKg: number
  heightCm: number
  age: number
}

/**
 * Mifflin-St Jeor basal metabolic rate.
 * Men:   10·weight + 6.25·height - 5·age + 5
 * Women: 10·weight + 6.25·height - 5·age - 161
 */
export function calculateBmr(input: BmrInput): number {
  const { sex, weightKg, heightCm, age } = input
  assertPositive(weightKg, 'weightKg')
  assertPositive(heightCm, 'heightCm')
  assertPositive(age, 'age')
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  return Math.round(sex === 'male' ? base + 5 : base - 161)
}

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

export function calculateTdee(bmr: number, activity: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[activity])
}

/** Deficit applied to TDEE in each phase. Peak week is maintenance. */
const PHASE_DEFICITS: Record<PhaseName, number> = {
  foundation: 500,
  build: 650,
  reveal: 750,
  peak: 0,
}

/**
 * TDEE minus phase deficit, clamped to the 1900 kcal floor.
 * If the math would go below the floor, returns 1900 AND sets `flaggedFloor` so
 * the UI can show the user a warning rather than silently cutting further.
 */
export function calculateTargetKcal(
  tdee: number,
  phase: PhaseName,
): { kcal: number; flaggedFloor: boolean } {
  const raw = tdee - PHASE_DEFICITS[phase]
  if (raw < CAL_FLOOR) return { kcal: CAL_FLOOR, flaggedFloor: true }
  return { kcal: Math.round(raw), flaggedFloor: false }
}

export class MacrosInfeasibleError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MacrosInfeasibleError'
  }
}

/**
 * Split kcal target into grams of protein, fat, carbs.
 * Priority order: protein first, fat floor, carbs fill.
 *  - Protein: 2.0 g/kg body weight
 *  - Fat: max(0.8 g/kg, 25% of total kcal)
 *  - Carbs: remaining kcal ÷ 4
 *
 * Throws MacrosInfeasibleError if the protein + fat floor exceeds kcal target
 * (not expected for any realistic adult body weight but checked for safety).
 */
export function calculateMacros(kcal: number, weightKg: number): Macros {
  assertPositive(kcal, 'kcal')
  assertPositive(weightKg, 'weightKg')

  const proteinG = Math.round(weightKg * 2.0)
  const proteinKcal = proteinG * 4

  const fatFloorKcal = Math.round(weightKg * 0.8) * 9
  const fat25PctKcal = kcal * 0.25
  const fatKcal = Math.max(fatFloorKcal, fat25PctKcal)
  const fatG = Math.round(fatKcal / 9)

  const carbsKcal = kcal - proteinKcal - fatG * 9
  if (carbsKcal < 0) {
    throw new MacrosInfeasibleError(
      `Protein (${proteinG}g) + fat (${fatG}g) floors exceed kcal target (${kcal}). ` +
        `This should not happen for realistic body weight + phase targets.`,
    )
  }
  const carbsG = Math.max(0, Math.round(carbsKcal / 4))

  return { kcal, proteinG, carbsG, fatG }
}

export type WeeklyMacroInput = {
  sex: Sex
  age: number
  heightCm: number
  weightKg: number
  activity: ActivityLevel
  phase: PhaseName
}

/** Full pipeline: profile + phase → macros for the week. */
export function weeklyMacros(
  input: WeeklyMacroInput,
): Macros & { flaggedFloor: boolean; tdee: number } {
  const bmr = calculateBmr(input)
  const tdee = calculateTdee(bmr, input.activity)
  const { kcal, flaggedFloor } = calculateTargetKcal(tdee, input.phase)
  const macros = calculateMacros(kcal, input.weightKg)
  return { ...macros, tdee, flaggedFloor }
}

function assertPositive(value: number, field: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new TypeError(`${field} must be a positive finite number, got ${value}`)
  }
}
