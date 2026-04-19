import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { formatLagos } from '@/lib/dates/lagos'
import { SessionView } from './session-view'
import type { SessionViewData } from './types'

export const dynamic = 'force-dynamic'

type PageProps = { params: { date: string } }

export default async function SessionDatePage({ params }: PageProps) {
  const { date } = params
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) notFound()

  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  // 1. Find the session for this calendar date (one per profile per date).
  const { data: sessionRow } = await supabase
    .from('sessions')
    .select(
      'id, day_number, day_of_week, type, name, session_date, warmup, mobility_block, cardio, red_flag_volume_cap, red_flag_reason, week_id',
    )
    .eq('profile_id', user.id)
    .eq('session_date', date)
    .maybeSingle()

  if (!sessionRow) {
    return <EmptySession date={date} reason="no_session" />
  }

  // 2. Which week + phase is this? For rendering the eyebrow.
  const { data: weekRow } = await supabase
    .from('weeks')
    .select('number, is_deload, target_kcal, phase_id')
    .eq('id', sessionRow.week_id)
    .maybeSingle()
  const { data: phaseRow } = weekRow
    ? await supabase.from('phases').select('name').eq('id', weekRow.phase_id).maybeSingle()
    : { data: null }

  // 3. Exercises scheduled in this session with join to exercise library.
  const { data: exerciseSlots } = await supabase
    .from('session_exercises')
    .select(
      'id, ord, exercise_slug, target_sets, target_reps_min, target_reps_max, target_load_kg, rest_seconds, tempo, notes',
    )
    .eq('session_id', sessionRow.id)
    .order('ord')

  // 4. Exercise library rows for these slugs.
  const slugs = (exerciseSlots ?? []).map((s) => s.exercise_slug)
  const { data: library } = slugs.length
    ? await supabase
        .from('exercises')
        .select(
          'slug, name, category, gif_url, posture_cues, benefits, movement_steps, safety_warnings, contraindications, body_changes_to_watch, common_mistakes, progression_slug, regression_slug, primary_muscles, secondary_muscles, equipment',
        )
        .in('slug', slugs)
    : { data: [] }

  const libMap = new Map((library ?? []).map((ex) => [ex.slug, ex]))

  // 5. Existing set logs for this session.
  const { data: setLogs } = await supabase
    .from('set_logs')
    .select('id, session_exercise_id, set_number, weight_kg, reps, rpe, notes, logged_at')
    .eq('session_id', sessionRow.id)
    .order('set_number')

  // 6. Previous set log per (session_exercise, exercise_slug) — for autofill.
  //    For each exercise slug, pull the latest set_log the user logged in any
  //    prior session, to pre-fill weight+reps.
  const previousDefaults = new Map<string, { weightKg: number | null; reps: number }>()
  for (const slug of slugs) {
    const { data: prior } = await supabase
      .from('set_logs')
      .select('weight_kg, reps, session_exercises!inner(exercise_slug)')
      .eq('profile_id', user.id)
      // Only rows whose joined session_exercises.exercise_slug matches
      .eq('session_exercises.exercise_slug', slug)
      .neq('session_id', sessionRow.id)
      .order('logged_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (prior) {
      previousDefaults.set(slug, { weightKg: prior.weight_kg, reps: prior.reps })
    }
  }

  // 7. Cardio log (if any) + session log (start/end state).
  const { data: cardioRow } = await supabase
    .from('cardio_logs')
    .select('id, modality, duration_seconds, distance_m, avg_hr, rpe, notes')
    .eq('session_id', sessionRow.id)
    .maybeSingle()

  const { data: logRow } = await supabase
    .from('session_logs')
    .select('id, started_at, ended_at, overall_rpe, notes')
    .eq('session_id', sessionRow.id)
    .maybeSingle()

  const data: SessionViewData = {
    date,
    dateLabel: formatLagos(`${date}T12:00:00Z`, 'EEEE, d MMMM'),
    session: {
      id: sessionRow.id,
      dayNumber: sessionRow.day_number,
      type: sessionRow.type,
      name: sessionRow.name,
      warmup: sessionRow.warmup,
      mobility: sessionRow.mobility_block,
      cardio: sessionRow.cardio,
      redFlagVolumeCap: sessionRow.red_flag_volume_cap,
      redFlagReason: sessionRow.red_flag_reason,
    },
    phase: phaseRow?.name ?? 'foundation',
    weekNumber: weekRow?.number ?? 1,
    isDeload: weekRow?.is_deload ?? false,
    exercises: (exerciseSlots ?? []).map((slot) => ({
      id: slot.id,
      ord: slot.ord,
      slug: slot.exercise_slug,
      targetSets: slot.target_sets,
      targetRepsMin: slot.target_reps_min,
      targetRepsMax: slot.target_reps_max,
      targetLoadKg: slot.target_load_kg,
      restSeconds: slot.rest_seconds,
      tempo: slot.tempo,
      notes: slot.notes,
      library: libMap.get(slot.exercise_slug) ?? null,
      previousDefault: previousDefaults.get(slot.exercise_slug) ?? null,
      setLogs: (setLogs ?? []).filter((l) => l.session_exercise_id === slot.id),
    })),
    cardioLog: cardioRow ?? null,
    sessionLog: logRow ?? null,
  }

  return <SessionView data={data} />
}

function EmptySession({ date, reason }: { date: string; reason: string }) {
  return (
    <section className="space-y-6 py-6">
      <p className="section-eyebrow">Session · {date}</p>
      <h1 className="font-display text-3xl leading-tight">Nothing scheduled.</h1>
      <p className="prose-readable text-sm text-muted-foreground">
        {reason === 'no_session'
          ? 'No session was generated for this date. If this is before your plan start date or after day 90, that is expected.'
          : 'Session data unavailable.'}
      </p>
      <Link href="/dashboard" className="section-eyebrow underline">
        Back to today
      </Link>
    </section>
  )
}
