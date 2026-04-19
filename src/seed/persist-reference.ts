/**
 * Reference-table persistence — `exercises` and `foods`.
 *
 * Uses service-role client (bypasses RLS; these tables have no insert policy
 * for authenticated users).
 *
 * @server-only — only the seed script imports this. The service-role client
 * factory in `src/lib/supabase/server.ts` enforces the runtime boundary.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { exerciseLibrary } from './exercises'
import { foodDatabase } from './foods'

export async function upsertExercises(supabase: SupabaseClient): Promise<number> {
  const rows = exerciseLibrary.map((ex) => ({
    slug: ex.slug,
    name: ex.name,
    category: ex.category,
    primary_muscles: ex.primary_muscles,
    secondary_muscles: ex.secondary_muscles,
    equipment: ex.equipment,
    difficulty: ex.difficulty,
    gif_url: ex.gif_url,
    posture_cues: ex.posture_cues,
    benefits: ex.benefits,
    movement_steps: ex.movement_steps,
    safety_warnings: ex.safety_warnings,
    contraindications: ex.contraindications,
    body_changes_to_watch: ex.body_changes_to_watch,
    common_mistakes: ex.common_mistakes,
    progression_slug: ex.progression,
    regression_slug: ex.regression,
    default_sets_min: ex.default_sets[0],
    default_sets_max: ex.default_sets[1],
    default_reps_min: ex.default_reps[0],
    default_reps_max: ex.default_reps[1],
    default_rest_seconds: ex.default_rest_seconds,
    tempo: ex.tempo,
  }))
  const { error } = await supabase.from('exercises').upsert(rows, { onConflict: 'slug' })
  if (error) throw new Error(`upsert exercises failed: ${error.message}`)
  return rows.length
}

export async function upsertFoods(supabase: SupabaseClient): Promise<number> {
  const rows = foodDatabase.map((f) => ({
    slug: f.slug,
    name: f.name,
    category: f.category,
    tags: f.tags,
    kcal_per_100g: f.kcal_per_100g,
    protein_per_100g: f.protein_per_100g,
    carbs_per_100g: f.carbs_per_100g,
    fat_per_100g: f.fat_per_100g,
    fiber_per_100g: f.fiber_per_100g,
    default_serving_g: f.default_serving_g,
    default_serving_label: f.default_serving_label,
    is_custom: false,
    created_by: null,
  }))
  const { error } = await supabase.from('foods').upsert(rows, { onConflict: 'slug' })
  if (error) throw new Error(`upsert foods failed: ${error.message}`)
  return rows.length
}
