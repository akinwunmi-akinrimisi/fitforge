/**
 * Weekly recalibration orchestrator — runs the pure engine against live DB
 * state for one profile's closing week.
 *
 * @server-only — service role (or user-scoped) Supabase client required.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { buildAdaptation, type Adaptation } from './engine'
import type {
  DailyCheckinSummary,
  NutritionDaySummary,
  PainNoteSummary,
  SessionLogSummary,
  WeighInSummary,
} from '@/domain/adaptation'
import { lagosAppDayWindowUtc } from '@/lib/dates/lagos'

export type WeeklyRecalibrateResult =
  | { ok: true; adaptation: Adaptation; idempotent: boolean }
  | { ok: false; reason: string }

/**
 * Run the recalibration for `profileId` closing `weekNumber`. Idempotent —
 * if an adaptation already exists for the (profile, weekNumber) pair, returns
 * it without re-running.
 */
export async function weeklyRecalibrate(
  supabase: SupabaseClient,
  profileId: string,
  weekNumber: number,
): Promise<WeeklyRecalibrateResult> {
  // ---- Idempotency check ---------------------------------------------------
  const { data: existing } = await supabase
    .from('adaptations')
    .select(
      'id, profile_id, plan_id, week_number_closed, week_number_adjusted, composite_score, training_compliance, nutrition_compliance, trend_kg, decision, changes, reasoning, flags',
    )
    .eq('profile_id', profileId)
    .eq('week_number_closed', weekNumber)
    .maybeSingle()

  if (existing) {
    return {
      ok: true,
      idempotent: true,
      adaptation: {
        profileId: existing.profile_id,
        planId: existing.plan_id,
        weekNumberClosed: existing.week_number_closed,
        weekNumberAdjusted: existing.week_number_adjusted,
        compositeScore: Number(existing.composite_score),
        trainingCompliance: Number(existing.training_compliance),
        nutritionCompliance: Number(existing.nutrition_compliance),
        trendKg: existing.trend_kg !== null ? Number(existing.trend_kg) : null,
        decision: existing.decision,
        changes: existing.changes,
        reasoning: existing.reasoning,
        flags: existing.flags ?? [],
      },
    }
  }

  // ---- Load plan + week context -------------------------------------------
  const { data: planRow } = await supabase
    .from('plans')
    .select('id')
    .eq('profile_id', profileId)
    .limit(1)
    .maybeSingle()
  if (!planRow) return { ok: false, reason: 'no active plan' }
  const planId: string = planRow.id

  const { data: weekRow } = await supabase
    .from('weeks')
    .select('id, number, target_kcal')
    .eq('plan_id', planId)
    .eq('number', weekNumber)
    .maybeSingle()
  if (!weekRow) return { ok: false, reason: `week ${weekNumber} not in plan` }

  // ---- Sessions in the closing week ---------------------------------------
  const { data: sessions } = await supabase
    .from('sessions')
    .select('id, session_date, day_number')
    .eq('plan_id', planId)
    .eq('week_id', weekRow.id)

  const sessionIds = (sessions ?? []).map((s) => s.id)

  // For each session that wasn't a rest day, count planned + completed sets.
  const { data: plannedSlots } = sessionIds.length
    ? await supabase
        .from('session_exercises')
        .select('id, session_id, exercise_slug, target_sets')
        .in('session_id', sessionIds)
    : { data: [] }

  const sessionExIds = (plannedSlots ?? []).map((p) => p.id)
  const { data: setLogs } = sessionExIds.length
    ? await supabase
        .from('set_logs')
        .select('session_exercise_id')
        .in('session_exercise_id', sessionExIds)
    : { data: [] }
  const completedCountByEx = new Map<string, number>()
  for (const s of setLogs ?? []) {
    completedCountByEx.set(
      s.session_exercise_id,
      (completedCountByEx.get(s.session_exercise_id) ?? 0) + 1,
    )
  }

  const { data: sessionLogs } = sessionIds.length
    ? await supabase
        .from('session_logs')
        .select('session_id, ended_at')
        .in('session_id', sessionIds)
    : { data: [] }
  const endedBySession = new Map((sessionLogs ?? []).map((l) => [l.session_id, !!l.ended_at]))

  const sessionSummaries: SessionLogSummary[] = (sessions ?? [])
    .map((s) => {
      const slots = (plannedSlots ?? []).filter((p) => p.session_id === s.id)
      if (slots.length === 0) return null // skip rest days
      const plannedSets = slots.reduce((acc, slot) => acc + slot.target_sets, 0)
      const completedSets = slots.reduce(
        (acc, slot) => acc + (completedCountByEx.get(slot.id) ?? 0),
        0,
      )
      return {
        sessionId: s.id,
        plannedSets,
        completedSets,
        completed:
          endedBySession.get(s.id) === true ||
          (plannedSets > 0 && completedSets / plannedSets >= 0.8),
        exerciseSlugs: slots.map((x) => x.exercise_slug),
      }
    })
    .filter((s): s is SessionLogSummary => s !== null)

  // ---- Nutrition 7 days ---------------------------------------------------
  const weekDateKeys = (sessions ?? []).map((s) => s.session_date).slice(0, 7)
  const nutritionSummaries: NutritionDaySummary[] = []
  for (const dateKey of weekDateKeys) {
    const { startUtc, endUtc } = lagosAppDayWindowUtc(dateKey)
    const { data: rows } = await supabase
      .from('nutrition_entries_with_macros')
      .select('kcal, protein_g')
      .eq('profile_id', profileId)
      .gte('logged_at', startUtc.toISOString())
      .lt('logged_at', endUtc.toISOString())
    const kcal = (rows ?? []).reduce((a, r) => a + Number(r.kcal ?? 0), 0)
    const proteinG = (rows ?? []).reduce((a, r) => a + Number(r.protein_g ?? 0), 0)
    nutritionSummaries.push({
      dateKey,
      kcal,
      proteinG,
      targetKcal: Number(weekRow.target_kcal),
      targetProteinG: 200, // placeholder; will use weekRow.protein_g in a follow-up pass
    })
  }

  // ---- Check-ins + pain + weigh-in ---------------------------------------
  const { data: checkins } = await supabase
    .from('daily_checkins')
    .select('check_date, sleep_hours, energy, soreness')
    .eq('profile_id', profileId)
    .in('check_date', weekDateKeys.length > 0 ? weekDateKeys : ['1970-01-01'])
  const checkinSummaries: DailyCheckinSummary[] = (checkins ?? []).map((c) => ({
    dateKey: c.check_date,
    sleepHours: c.sleep_hours,
    energy: c.energy,
    soreness: c.soreness,
  }))

  const { data: pains } = sessionIds.length
    ? await supabase
        .from('pain_notes')
        .select('location, severity, session_exercise_id')
        .in('session_id', sessionIds)
    : { data: [] }
  const painSummaries: PainNoteSummary[] = (pains ?? []).map((p) => ({
    location: p.location,
    severity: p.severity,
    exerciseSlug: null,
  }))

  // Latest weigh-in on or before the closing week's last day.
  const lastDateKey = weekDateKeys.at(-1) ?? null
  let weighIn: WeighInSummary | null = null
  if (lastDateKey) {
    const { data: rows } = await supabase
      .from('body_weight_trend')
      .select('weight_kg, trend_7_kg, measured_on')
      .eq('profile_id', profileId)
      .lte('measured_on', lastDateKey)
      .order('measured_on', { ascending: false })
      .limit(1)
    const row = rows?.[0]
    if (row?.weight_kg && row.trend_7_kg) {
      // Need prior trend to compute delta-trend; here we just use trend_7_kg.
      weighIn = { kg: Number(row.weight_kg), trend7dKg: Number(row.trend_7_kg) }
    }
  }

  // ---- Last adaptation for "consecutive slow weeks" ----------------------
  const { data: lastAd } = await supabase
    .from('adaptations')
    .select('decision, week_number_closed, trend_kg')
    .eq('profile_id', profileId)
    .order('week_number_closed', { ascending: false })
    .limit(1)
    .maybeSingle()

  // ---- Focus lifts: pick the most-frequent main-compound slugs of the week
  const slugCount = new Map<string, number>()
  for (const slot of plannedSlots ?? []) {
    slugCount.set(slot.exercise_slug, (slugCount.get(slot.exercise_slug) ?? 0) + 1)
  }
  const focusLifts = Array.from(slugCount.keys())
    .filter((slug) => slug.startsWith('barbell-') || slug === 'romanian-deadlift')
    .slice(0, 6)

  // ---- Build adaptation (pure) -------------------------------------------
  const adaptation = buildAdaptation(
    {
      profileId,
      planId,
      weekNumber,
      sessions: sessionSummaries,
      nutritionEntries: nutritionSummaries,
      checkins: checkinSummaries,
      weighIn,
      painNotes: painSummaries,
      lastAdaptation: lastAd
        ? { decision: lastAd.decision, weekNumberClosed: lastAd.week_number_closed }
        : null,
      trendKgPrev: lastAd?.trend_kg ? Number(lastAd.trend_kg) : null,
    },
    Number(weekRow.target_kcal),
    focusLifts,
  )

  // ---- Persist ------------------------------------------------------------
  const { error: writeErr } = await supabase.from('adaptations').insert({
    profile_id: adaptation.profileId,
    plan_id: adaptation.planId,
    week_number_closed: adaptation.weekNumberClosed,
    week_number_adjusted: adaptation.weekNumberAdjusted,
    composite_score: adaptation.compositeScore,
    training_compliance: adaptation.trainingCompliance,
    nutrition_compliance: adaptation.nutritionCompliance,
    trend_kg: adaptation.trendKg,
    decision: adaptation.decision,
    changes: adaptation.changes,
    reasoning: adaptation.reasoning,
    flags: adaptation.flags,
  })

  if (writeErr) {
    return { ok: false, reason: `write failed: ${writeErr.message}` }
  }

  return { ok: true, adaptation, idempotent: false }
}
