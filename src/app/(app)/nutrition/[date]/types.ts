import type { MealType } from '@/domain/nutrition'

export type MacroTotals = {
  kcal: number
  proteinG: number
  carbsG: number
  fatG: number
  fiberG: number
}

export type MacroTargets = {
  kcal: number
  proteinG: number
  carbsG: number
  fatG: number
}

export type FoodRow = {
  id: string
  slug: string
  name: string
  category: string
  tags: string[]
  kcal_per_100g: number
  protein_per_100g: number
  carbs_per_100g: number
  fat_per_100g: number
  fiber_per_100g: number
  default_serving_g: number
  default_serving_label: string
  is_custom: boolean
}

export type NutritionEntryRow = {
  id: string
  food_id: string
  food_slug: string
  food_name: string
  meal_type: MealType
  servings_g: number
  logged_at: string
  notes: string | null
  kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
}

export type WaterLogRow = {
  id: string
  amount_ml: number
  logged_at: string
}

export type SavedMealWithItems = {
  id: string
  name: string
  default_meal_type: MealType | null
  items: Array<{
    food_id: string
    food_slug: string
    food_name: string
    servings_g: number
    ord: number
  }>
}

export type NutritionPageData = {
  date: string
  dateLabel: string
  targets: MacroTargets
  totals: MacroTotals
  entriesByMeal: Record<MealType, NutritionEntryRow[]>
  waterEntries: WaterLogRow[]
  waterTargetMl: number
  savedMeals: SavedMealWithItems[]
  weekCompliance: WeekComplianceDay[]
}

export type WeekComplianceDay = {
  dateKey: string
  label: string // e.g. "Mon"
  kcalPct: number // % of target
  proteinPct: number
  carbsPct: number
  fatPct: number
}
