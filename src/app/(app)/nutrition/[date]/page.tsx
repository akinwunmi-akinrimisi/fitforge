import { notFound } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { formatLagos, lagosAppDayWindowUtc } from '@/lib/dates/lagos'
import { NutritionView } from './nutrition-view'
import type {
  MacroTargets,
  MacroTotals,
  NutritionEntryRow,
  NutritionPageData,
  SavedMealWithItems,
  WaterLogRow,
  WeekComplianceDay,
} from './types'
import type { MealType } from '@/domain/nutrition'

export const dynamic = 'force-dynamic'

const WATER_TARGET_ML = 3500

export default async function NutritionDatePage({ params }: { params: { date: string } }) {
  const { date } = params
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound()

  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const { startUtc, endUtc } = lagosAppDayWindowUtc(date)

  // 1. Targets for this date — pull the week row whose sessions contain this date.
  const targets = await loadTargetsForDate(supabase, user.id, date)

  // 2. Day's entries + derived macros via the view.
  const { data: entryRows } = await supabase
    .from('nutrition_entries_with_macros')
    .select(
      'id, food_id, food_slug, food_name, meal_type, servings_g, logged_at, notes, kcal, protein_g, carbs_g, fat_g, fiber_g',
    )
    .eq('profile_id', user.id)
    .gte('logged_at', startUtc.toISOString())
    .lt('logged_at', endUtc.toISOString())
    .order('logged_at')

  const entries = (entryRows ?? []) as NutritionEntryRow[]

  // 3. Water for the same window.
  const { data: waterRows } = await supabase
    .from('water_logs')
    .select('id, amount_ml, logged_at')
    .eq('profile_id', user.id)
    .gte('logged_at', startUtc.toISOString())
    .lt('logged_at', endUtc.toISOString())
    .order('logged_at')
  const waterEntries: WaterLogRow[] = waterRows ?? []

  // 4. Saved meals (header + items).
  const { data: savedMealHeaders } = await supabase
    .from('user_saved_meals')
    .select('id, name, default_meal_type')
    .eq('profile_id', user.id)
    .order('name')

  const savedMealIds = (savedMealHeaders ?? []).map((s) => s.id)
  const { data: savedMealItems } = savedMealIds.length
    ? await supabase
        .from('user_saved_meal_items')
        .select('id, saved_meal_id, food_id, servings_g, ord')
        .in('saved_meal_id', savedMealIds)
        .order('ord')
    : { data: [] }

  const foodIds = Array.from(new Set((savedMealItems ?? []).map((i) => i.food_id)))
  const { data: itemFoods } = foodIds.length
    ? await supabase.from('foods').select('id, slug, name').in('id', foodIds)
    : { data: [] }
  const foodLookup = new Map((itemFoods ?? []).map((f) => [f.id, f]))

  const savedMeals: SavedMealWithItems[] = (savedMealHeaders ?? []).map((h) => ({
    id: h.id,
    name: h.name,
    default_meal_type: h.default_meal_type as MealType | null,
    items: (savedMealItems ?? [])
      .filter((i) => i.saved_meal_id === h.id)
      .map((i) => ({
        food_id: i.food_id,
        food_slug: foodLookup.get(i.food_id)?.slug ?? '',
        food_name: foodLookup.get(i.food_id)?.name ?? '',
        servings_g: i.servings_g,
        ord: i.ord,
      })),
  }))

  // 5. Week compliance heatmap (last 7 app-days up to and including `date`).
  const weekCompliance = await loadWeekCompliance(supabase, user.id, date, targets)

  // Totals per meal (sum from entries)
  const totals: MacroTotals = aggregate(entries)
  const entriesByMeal: Record<MealType, NutritionEntryRow[]> = {
    breakfast: entries.filter((e) => e.meal_type === 'breakfast'),
    lunch: entries.filter((e) => e.meal_type === 'lunch'),
    dinner: entries.filter((e) => e.meal_type === 'dinner'),
    snack: entries.filter((e) => e.meal_type === 'snack'),
  }

  const pageData: NutritionPageData = {
    date,
    dateLabel: formatLagos(`${date}T12:00:00Z`, 'EEEE, d MMMM'),
    targets,
    totals,
    entriesByMeal,
    waterEntries,
    waterTargetMl: WATER_TARGET_ML,
    savedMeals,
    weekCompliance,
  }

  return <NutritionView data={pageData} />
}

async function loadTargetsForDate(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  date: string,
): Promise<MacroTargets> {
  const { data: session } = await supabase
    .from('sessions')
    .select('week_id')
    .eq('profile_id', userId)
    .eq('session_date', date)
    .maybeSingle()

  if (session?.week_id) {
    const { data: week } = await supabase
      .from('weeks')
      .select('target_kcal, protein_g, carbs_g, fat_g')
      .eq('id', session.week_id)
      .maybeSingle()
    if (week) {
      return {
        kcal: week.target_kcal,
        proteinG: week.protein_g,
        carbsG: week.carbs_g,
        fatG: week.fat_g,
      }
    }
  }

  // Fallback: the user's most recent active week.
  const { data: recent } = await supabase
    .from('weeks')
    .select('target_kcal, protein_g, carbs_g, fat_g')
    .eq('profile_id', userId)
    .order('number', { ascending: false })
    .limit(1)
    .maybeSingle()

  return {
    kcal: recent?.target_kcal ?? 2500,
    proteinG: recent?.protein_g ?? 180,
    carbsG: recent?.carbs_g ?? 250,
    fatG: recent?.fat_g ?? 70,
  }
}

async function loadWeekCompliance(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  lastDateKey: string,
  targets: MacroTargets,
): Promise<WeekComplianceDay[]> {
  const days: WeekComplianceDay[] = []
  for (let i = 6; i >= 0; i--) {
    const d = addDays(lastDateKey, -i)
    const { startUtc, endUtc } = lagosAppDayWindowUtc(d)
    const { data: rows } = await supabase
      .from('nutrition_entries_with_macros')
      .select('kcal, protein_g, carbs_g, fat_g')
      .eq('profile_id', userId)
      .gte('logged_at', startUtc.toISOString())
      .lt('logged_at', endUtc.toISOString())

    const totals = aggregate(rows ?? [])
    days.push({
      dateKey: d,
      label: formatLagos(`${d}T12:00:00Z`, 'EEE'),
      kcalPct: pct(totals.kcal, targets.kcal),
      proteinPct: pct(totals.proteinG, targets.proteinG),
      carbsPct: pct(totals.carbsG, targets.carbsG),
      fatPct: pct(totals.fatG, targets.fatG),
    })
  }
  return days
}

function aggregate(
  rows: Array<{
    kcal?: number | null
    protein_g?: number | null
    carbs_g?: number | null
    fat_g?: number | null
    fiber_g?: number | null
  }>,
): MacroTotals {
  let kcal = 0
  let proteinG = 0
  let carbsG = 0
  let fatG = 0
  let fiberG = 0
  for (const r of rows) {
    kcal += Number(r.kcal ?? 0)
    proteinG += Number(r.protein_g ?? 0)
    carbsG += Number(r.carbs_g ?? 0)
    fatG += Number(r.fat_g ?? 0)
    fiberG += Number(r.fiber_g ?? 0)
  }
  return {
    kcal: Math.round(kcal),
    proteinG: Math.round(proteinG),
    carbsG: Math.round(carbsG),
    fatG: Math.round(fatG),
    fiberG: Math.round(fiberG),
  }
}

function pct(actual: number, target: number): number {
  if (!target) return 0
  return Math.round((actual / target) * 100)
}

function addDays(dateKey: string, delta: number): string {
  const [y, m, d] = dateKey.split('-').map(Number)
  const dt = new Date(Date.UTC(y!, m! - 1, d!))
  dt.setUTCDate(dt.getUTCDate() + delta)
  return dt.toISOString().slice(0, 10)
}
