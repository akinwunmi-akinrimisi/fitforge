/**
 * Plan persistence — writes a generated Plan to the Supabase DB.
 *
 * Uses the service-role client because seeding happens for a specific
 * profile_id and populates owner-scoped rows that RLS would block under an
 * anonymous JWT. The caller (the seed script or a Server Action) is a trusted
 * code path.
 *
 * @server-only — do NOT import from Client Components. Enforcement lives in
 * the service-role client factory (`src/lib/supabase/server.ts`), which has
 * the `import 'server-only'` guard.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Plan } from '@/domain/plan'

export type PlanPersistResult = {
  planId: string
  phaseCount: number
  weekCount: number
  sessionCount: number
  exerciseRowCount: number
}

/**
 * Upserts a full plan hierarchy for a single profile:
 *   plan  → phases → weeks → sessions → session_exercises
 *
 * Idempotent per `(profile_id, version)` on `plans`. Re-running overwrites the
 * child rows by deleting them first (via FK cascade from the deleted plan),
 * then re-inserting. Single-user project — no transaction-within-HTTP-request
 * concern yet.
 */
export async function writePlanToDb(
  supabase: SupabaseClient,
  plan: Plan,
): Promise<PlanPersistResult> {
  // 1. Upsert the `plans` row (one per profile for M2).
  //    Delete any prior plan so we don't accumulate stale child rows.
  const { error: delErr } = await supabase.from('plans').delete().eq('profile_id', plan.profileId)
  if (delErr) throw new Error(`failed to clear old plans: ${delErr.message}`)

  const { data: planRow, error: planErr } = await supabase
    .from('plans')
    .insert({
      profile_id: plan.profileId,
      start_date: plan.startDate,
      version: 1,
    })
    .select('id')
    .single()
  if (planErr || !planRow) throw new Error(`failed to insert plan: ${planErr?.message}`)

  const planId: string = planRow.id

  // 2. Phases
  const phasesPayload = plan.phases.map((ph) => ({
    plan_id: planId,
    profile_id: plan.profileId,
    number: ph.number,
    name: ph.name,
  }))
  const { data: phaseRows, error: phaseErr } = await supabase
    .from('phases')
    .insert(phasesPayload)
    .select('id, number')
  if (phaseErr || !phaseRows) throw new Error(`failed to insert phases: ${phaseErr?.message}`)

  const phaseIdByNumber = new Map(phaseRows.map((p) => [p.number, p.id]))

  // 3. Weeks
  const weeksPayload = plan.phases.flatMap((ph) =>
    ph.weeks.map((w) => ({
      plan_id: planId,
      profile_id: plan.profileId,
      phase_id: phaseIdByNumber.get(ph.number)!,
      number: w.number,
      is_deload: w.isDeload,
      target_kcal: w.targetKcal,
      protein_g: w.macros.proteinG,
      carbs_g: w.macros.carbsG,
      fat_g: w.macros.fatG,
    })),
  )
  const { data: weekRows, error: weekErr } = await supabase
    .from('weeks')
    .insert(weeksPayload)
    .select('id, number')
  if (weekErr || !weekRows) throw new Error(`failed to insert weeks: ${weekErr?.message}`)

  const weekIdByNumber = new Map(weekRows.map((w) => [w.number, w.id]))

  // 4. Sessions — compute session_date from plan.startDate + (dayNumber - 1) days.
  //    Skip placeholder rest sessions with dayNumber > 90.
  const start = new Date(`${plan.startDate}T00:00:00Z`)
  const sessionsPayload: Array<{
    week_id: string
    plan_id: string
    profile_id: string
    day_number: number
    day_of_week: number
    type: string
    name: string
    session_date: string
    cardio: unknown
    warmup: unknown
    mobility_block: unknown
  }> = []

  for (const phase of plan.phases) {
    for (const week of phase.weeks) {
      for (const session of week.sessions) {
        if (session.dayNumber > 90) continue
        const d = new Date(start)
        d.setUTCDate(d.getUTCDate() + session.dayNumber - 1)
        const sessionDate = d.toISOString().slice(0, 10)

        sessionsPayload.push({
          week_id: weekIdByNumber.get(week.number)!,
          plan_id: planId,
          profile_id: plan.profileId,
          day_number: session.dayNumber,
          day_of_week: session.dayOfWeek,
          type: session.type,
          name: session.name,
          session_date: sessionDate,
          cardio: session.cardio,
          warmup: session.warmup,
          mobility_block: session.mobilityBlock,
        })
      }
    }
  }

  const { data: sessionRows, error: sessErr } = await supabase
    .from('sessions')
    .insert(sessionsPayload)
    .select('id, day_number')
  if (sessErr || !sessionRows) throw new Error(`failed to insert sessions: ${sessErr?.message}`)

  const sessionIdByDay = new Map(sessionRows.map((s) => [s.day_number, s.id]))

  // 5. Session exercises
  const exercisesPayload: Array<{
    session_id: string
    profile_id: string
    exercise_slug: string
    ord: number
    target_sets: number
    target_reps_min: number
    target_reps_max: number
    target_load_kg: number | null
    rest_seconds: number
    tempo: string | null
    notes: string | null
  }> = []
  for (const phase of plan.phases) {
    for (const week of phase.weeks) {
      for (const session of week.sessions) {
        if (session.dayNumber > 90) continue
        const sid = sessionIdByDay.get(session.dayNumber)
        if (!sid) continue
        for (const ex of session.exercises) {
          exercisesPayload.push({
            session_id: sid,
            profile_id: plan.profileId,
            exercise_slug: ex.exerciseSlug,
            ord: ex.order,
            target_sets: ex.targetSets,
            target_reps_min: ex.targetRepsMin,
            target_reps_max: ex.targetRepsMax,
            target_load_kg: ex.targetLoadKg,
            rest_seconds: ex.restSeconds,
            tempo: ex.tempo,
            notes: ex.notes,
          })
        }
      }
    }
  }

  if (exercisesPayload.length > 0) {
    const { error: exErr } = await supabase.from('session_exercises').insert(exercisesPayload)
    if (exErr) throw new Error(`failed to insert session_exercises: ${exErr.message}`)
  }

  return {
    planId,
    phaseCount: plan.phases.length,
    weekCount: weeksPayload.length,
    sessionCount: sessionsPayload.length,
    exerciseRowCount: exercisesPayload.length,
  }
}
