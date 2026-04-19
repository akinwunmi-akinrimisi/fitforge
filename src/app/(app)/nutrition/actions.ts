'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  customFoodInputSchema,
  nutritionEntryInputSchema,
  savedMealInputSchema,
  waterLogInputSchema,
  type CustomFoodInput,
  type NutritionEntryInput,
  type SavedMealInput,
  type WaterLogInput,
} from '@/domain/nutrition'

type ActionResult<T = void> =
  | (T extends void ? { ok: true } : { ok: true; data: T })
  | { ok: false; message: string }

async function getUserId(): Promise<string> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw new Error('Not authenticated')
  return data.user.id
}

function logServerError(action: string, err: unknown): void {
  // eslint-disable-next-line no-console
  console.error(`[action ${action}]`, { name: err instanceof Error ? err.name : 'unknown' })
}

// ---------------------------------------------------------------------------
// Food log
// ---------------------------------------------------------------------------

export async function addNutritionEntry(
  input: NutritionEntryInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = nutritionEntryInputSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Invalid entry' }
  }

  try {
    const userId = await getUserId()
    const supabase = createSupabaseServerClient()

    const { data, error } = await supabase
      .from('nutrition_entries')
      .insert({
        profile_id: userId,
        food_id: parsed.data.foodId,
        meal_type: parsed.data.mealType,
        servings_g: parsed.data.servingsG,
        logged_at: parsed.data.loggedAt ?? new Date().toISOString(),
        notes: parsed.data.notes ?? null,
      })
      .select('id')
      .single()

    if (error || !data) {
      logServerError('addNutritionEntry', error)
      return { ok: false, message: 'Could not log food.' }
    }
    return { ok: true, data: { id: data.id } }
  } catch (err) {
    logServerError('addNutritionEntry', err)
    return { ok: false, message: 'Unexpected error.' }
  }
}

export async function updateNutritionEntryServings(
  id: string,
  servingsG: number,
): Promise<ActionResult> {
  if (!Number.isFinite(servingsG) || servingsG <= 0 || servingsG > 5000) {
    return { ok: false, message: 'Servings must be 0-5000g.' }
  }
  try {
    const userId = await getUserId()
    const supabase = createSupabaseServerClient()
    const { error } = await supabase
      .from('nutrition_entries')
      .update({ servings_g: servingsG })
      .eq('id', id)
      .eq('profile_id', userId)
    if (error) {
      logServerError('updateNutritionEntryServings', error)
      return { ok: false, message: 'Could not update.' }
    }
    return { ok: true }
  } catch (err) {
    logServerError('updateNutritionEntryServings', err)
    return { ok: false, message: 'Unexpected error.' }
  }
}

export async function removeNutritionEntry(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    const supabase = createSupabaseServerClient()
    const { error } = await supabase
      .from('nutrition_entries')
      .delete()
      .eq('id', id)
      .eq('profile_id', userId)
    if (error) {
      logServerError('removeNutritionEntry', error)
      return { ok: false, message: 'Could not delete.' }
    }
    return { ok: true }
  } catch (err) {
    logServerError('removeNutritionEntry', err)
    return { ok: false, message: 'Unexpected error.' }
  }
}

// ---------------------------------------------------------------------------
// Custom foods — the "Add custom food" tab on the food search sheet
// ---------------------------------------------------------------------------

export async function addCustomFood(
  input: CustomFoodInput,
): Promise<ActionResult<{ id: string; slug: string }>> {
  const parsed = customFoodInputSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Invalid food' }
  }
  try {
    const userId = await getUserId()
    const supabase = createSupabaseServerClient()

    const slug = `custom-${userId.slice(0, 8)}-${slugify(parsed.data.name)}-${Date.now().toString(36).slice(-4)}`

    const { data, error } = await supabase
      .from('foods')
      .insert({
        slug,
        name: parsed.data.name,
        category: 'global', // custom foods default to 'global'
        tags: [...parsed.data.tags, 'custom'],
        kcal_per_100g: parsed.data.kcalPer100g,
        protein_per_100g: parsed.data.proteinPer100g,
        carbs_per_100g: parsed.data.carbsPer100g,
        fat_per_100g: parsed.data.fatPer100g,
        fiber_per_100g: parsed.data.fiberPer100g,
        default_serving_g: parsed.data.defaultServingG,
        default_serving_label: parsed.data.defaultServingLabel,
        is_custom: true,
        created_by: userId,
      })
      .select('id, slug')
      .single()

    if (error || !data) {
      logServerError('addCustomFood', error)
      return { ok: false, message: 'Could not save custom food.' }
    }
    return { ok: true, data: { id: data.id, slug: data.slug } }
  } catch (err) {
    logServerError('addCustomFood', err)
    return { ok: false, message: 'Unexpected error.' }
  }
}

// ---------------------------------------------------------------------------
// Saved meals — "My meals" tab
// ---------------------------------------------------------------------------

export async function saveMeal(input: SavedMealInput): Promise<ActionResult<{ id: string }>> {
  const parsed = savedMealInputSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Invalid meal' }
  }
  try {
    const userId = await getUserId()
    const supabase = createSupabaseServerClient()

    const { data: saved, error: savedErr } = await supabase
      .from('user_saved_meals')
      .insert({
        profile_id: userId,
        name: parsed.data.name,
        default_meal_type: parsed.data.defaultMealType ?? null,
      })
      .select('id')
      .single()

    if (savedErr || !saved) {
      logServerError('saveMeal/header', savedErr)
      return { ok: false, message: 'Could not save meal.' }
    }

    const items = parsed.data.items.map((it, idx) => ({
      saved_meal_id: saved.id,
      profile_id: userId,
      food_id: it.foodId,
      servings_g: it.servingsG,
      ord: idx,
    }))

    const { error: itemsErr } = await supabase.from('user_saved_meal_items').insert(items)
    if (itemsErr) {
      logServerError('saveMeal/items', itemsErr)
      // Best-effort cleanup of orphaned header.
      await supabase.from('user_saved_meals').delete().eq('id', saved.id)
      return { ok: false, message: 'Could not save meal items.' }
    }

    return { ok: true, data: { id: saved.id } }
  } catch (err) {
    logServerError('saveMeal', err)
    return { ok: false, message: 'Unexpected error.' }
  }
}

export async function logSavedMeal(
  savedMealId: string,
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack',
): Promise<ActionResult<{ count: number }>> {
  try {
    const userId = await getUserId()
    const supabase = createSupabaseServerClient()

    const { data: items } = await supabase
      .from('user_saved_meal_items')
      .select('food_id, servings_g')
      .eq('saved_meal_id', savedMealId)
      .eq('profile_id', userId)

    if (!items || items.length === 0) {
      return { ok: false, message: 'Meal has no items.' }
    }

    const rows = items.map((it) => ({
      profile_id: userId,
      food_id: it.food_id,
      meal_type: mealType,
      servings_g: it.servings_g,
      logged_at: new Date().toISOString(),
    }))

    const { error } = await supabase.from('nutrition_entries').insert(rows)
    if (error) {
      logServerError('logSavedMeal', error)
      return { ok: false, message: 'Could not log meal.' }
    }
    return { ok: true, data: { count: rows.length } }
  } catch (err) {
    logServerError('logSavedMeal', err)
    return { ok: false, message: 'Unexpected error.' }
  }
}

// ---------------------------------------------------------------------------
// Water
// ---------------------------------------------------------------------------

export async function addWater(input: WaterLogInput): Promise<ActionResult<{ id: string }>> {
  const parsed = waterLogInputSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Invalid water amount' }
  }
  try {
    const userId = await getUserId()
    const supabase = createSupabaseServerClient()
    const { data, error } = await supabase
      .from('water_logs')
      .insert({ profile_id: userId, amount_ml: parsed.data.amountMl })
      .select('id')
      .single()
    if (error || !data) {
      logServerError('addWater', error)
      return { ok: false, message: 'Could not log water.' }
    }
    return { ok: true, data: { id: data.id } }
  } catch (err) {
    logServerError('addWater', err)
    return { ok: false, message: 'Unexpected error.' }
  }
}

export async function removeWater(id: string): Promise<ActionResult> {
  try {
    const userId = await getUserId()
    const supabase = createSupabaseServerClient()
    const { error } = await supabase
      .from('water_logs')
      .delete()
      .eq('id', id)
      .eq('profile_id', userId)
    if (error) {
      logServerError('removeWater', error)
      return { ok: false, message: 'Could not remove.' }
    }
    return { ok: true }
  } catch (err) {
    logServerError('removeWater', err)
    return { ok: false, message: 'Unexpected error.' }
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30)
}

export async function revalidateNutrition(date: string): Promise<void> {
  revalidatePath(`/nutrition/${date}`)
}
