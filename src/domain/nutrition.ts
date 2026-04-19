import { z } from 'zod'

export const mealTypeEnum = z.enum(['breakfast', 'lunch', 'dinner', 'snack'])
export type MealType = z.infer<typeof mealTypeEnum>

export const nutritionEntryInputSchema = z
  .object({
    foodId: z.string().uuid(),
    mealType: mealTypeEnum,
    servingsG: z.number().positive().max(5000),
    loggedAt: z.string().datetime().optional(),
    notes: z.string().max(500).optional(),
  })
  .strict()
export type NutritionEntryInput = z.infer<typeof nutritionEntryInputSchema>

export const customFoodInputSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    tags: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
    kcalPer100g: z.number().nonnegative().max(1000),
    proteinPer100g: z.number().nonnegative().max(100),
    carbsPer100g: z.number().nonnegative().max(100),
    fatPer100g: z.number().nonnegative().max(100),
    fiberPer100g: z.number().nonnegative().max(100).default(0),
    defaultServingG: z.number().positive().max(5000),
    defaultServingLabel: z.string().trim().min(1).max(60),
  })
  .strict()
export type CustomFoodInput = z.infer<typeof customFoodInputSchema>

export const waterLogInputSchema = z
  .object({
    amountMl: z.number().int().min(1).max(5000),
  })
  .strict()
export type WaterLogInput = z.infer<typeof waterLogInputSchema>

export const savedMealInputSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    defaultMealType: mealTypeEnum.optional(),
    items: z
      .array(
        z
          .object({
            foodId: z.string().uuid(),
            servingsG: z.number().positive().max(5000),
          })
          .strict(),
      )
      .min(1)
      .max(20),
  })
  .strict()
export type SavedMealInput = z.infer<typeof savedMealInputSchema>

/** Target macros for a week — mirrors what the plan generator wrote into weeks. */
export type WeeklyMacroTargets = {
  kcal: number
  proteinG: number
  carbsG: number
  fatG: number
}

/** Daily totals derived from nutrition_entries_with_macros for the UI ring. */
export type DailyMacroTotals = {
  kcal: number
  proteinG: number
  carbsG: number
  fatG: number
  fiberG: number
}

/** Sum entries into daily totals. */
export function sumDailyMacros(
  entries: Array<
    Pick<DailyMacroTotals, never> & {
      kcal: number
      protein_g?: number | null
      carbs_g?: number | null
      fat_g?: number | null
      fiber_g?: number | null
    }
  >,
): DailyMacroTotals {
  let kcal = 0
  let proteinG = 0
  let carbsG = 0
  let fatG = 0
  let fiberG = 0
  for (const e of entries) {
    kcal += e.kcal ?? 0
    proteinG += e.protein_g ?? 0
    carbsG += e.carbs_g ?? 0
    fatG += e.fat_g ?? 0
    fiberG += e.fiber_g ?? 0
  }
  return {
    kcal: Math.round(kcal),
    proteinG: Math.round(proteinG),
    carbsG: Math.round(carbsG),
    fatG: Math.round(fatG),
    fiberG: Math.round(fiberG),
  }
}
