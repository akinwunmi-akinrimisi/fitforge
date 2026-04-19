'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  cardioLogSchema,
  painNoteSchema,
  sessionReflectionSchema,
  setLogSchema,
  type CardioLogInput,
  type PainNoteInput,
  type SessionReflectionInput,
  type SetLogInput,
} from '@/domain/log'

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

/**
 * Idempotent — creates a session_logs row the first time it's called for a
 * given session. Subsequent calls return the existing row id.
 */
export async function startSession(sessionId: string): Promise<ActionResult<{ logId: string }>> {
  try {
    const userId = await getUserId()
    const supabase = createSupabaseServerClient()

    const { data: existing } = await supabase
      .from('session_logs')
      .select('id')
      .eq('session_id', sessionId)
      .eq('profile_id', userId)
      .maybeSingle()

    if (existing?.id) return { ok: true, data: { logId: existing.id } }

    const { data, error } = await supabase
      .from('session_logs')
      .insert({ session_id: sessionId, profile_id: userId })
      .select('id')
      .single()

    if (error || !data) {
      logServerError('startSession', error)
      return { ok: false, message: 'Could not start session.' }
    }

    return { ok: true, data: { logId: data.id } }
  } catch (err) {
    logServerError('startSession', err)
    return { ok: false, message: 'Unexpected error.' }
  }
}

export async function logSet(
  input: SetLogInput,
): Promise<ActionResult<{ setLogId: string; pathDate?: string }>> {
  const parsed = setLogSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Invalid set data' }
  }

  try {
    const userId = await getUserId()
    const supabase = createSupabaseServerClient()

    // Ensure a session_log exists for this session (ignore existing).
    await startSession(parsed.data.sessionId)

    const { data, error } = await supabase
      .from('set_logs')
      .upsert(
        {
          profile_id: userId,
          session_id: parsed.data.sessionId,
          session_exercise_id: parsed.data.sessionExerciseId,
          set_number: parsed.data.setNumber,
          weight_kg: parsed.data.weightKg,
          reps: parsed.data.reps,
          rpe: parsed.data.rpe ?? null,
          notes: parsed.data.notes ?? null,
        },
        { onConflict: 'session_exercise_id,set_number' },
      )
      .select('id')
      .single()

    if (error || !data) {
      logServerError('logSet', error)
      return { ok: false, message: 'Could not save set.' }
    }

    return { ok: true, data: { setLogId: data.id } }
  } catch (err) {
    logServerError('logSet', err)
    return { ok: false, message: 'Unexpected error.' }
  }
}

export async function undoLastSet(
  sessionExerciseId: string,
): Promise<ActionResult<{ deletedSetNumber: number | null }>> {
  try {
    const userId = await getUserId()
    const supabase = createSupabaseServerClient()

    const { data: last } = await supabase
      .from('set_logs')
      .select('id, set_number')
      .eq('session_exercise_id', sessionExerciseId)
      .eq('profile_id', userId)
      .order('set_number', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!last) return { ok: true, data: { deletedSetNumber: null } }

    const { error } = await supabase.from('set_logs').delete().eq('id', last.id)
    if (error) {
      logServerError('undoLastSet', error)
      return { ok: false, message: 'Could not undo.' }
    }

    return { ok: true, data: { deletedSetNumber: last.set_number } }
  } catch (err) {
    logServerError('undoLastSet', err)
    return { ok: false, message: 'Unexpected error.' }
  }
}

export async function logCardio(input: CardioLogInput): Promise<ActionResult<{ id: string }>> {
  const parsed = cardioLogSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Invalid cardio data' }
  }

  try {
    const userId = await getUserId()
    const supabase = createSupabaseServerClient()
    await startSession(parsed.data.sessionId)

    const { data, error } = await supabase
      .from('cardio_logs')
      .insert({
        profile_id: userId,
        session_id: parsed.data.sessionId,
        modality: parsed.data.modality,
        duration_seconds: parsed.data.durationSeconds,
        distance_m: parsed.data.distanceM ?? null,
        avg_hr: parsed.data.avgHr ?? null,
        rpe: parsed.data.rpe,
        notes: parsed.data.notes ?? null,
      })
      .select('id')
      .single()

    if (error || !data) {
      logServerError('logCardio', error)
      return { ok: false, message: 'Could not save cardio.' }
    }

    return { ok: true, data: { id: data.id } }
  } catch (err) {
    logServerError('logCardio', err)
    return { ok: false, message: 'Unexpected error.' }
  }
}

export async function logPain(input: PainNoteInput): Promise<ActionResult<{ id: string }>> {
  const parsed = painNoteSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Invalid pain note' }
  }

  try {
    const userId = await getUserId()
    const supabase = createSupabaseServerClient()

    const { data, error } = await supabase
      .from('pain_notes')
      .insert({
        profile_id: userId,
        session_id: parsed.data.sessionId ?? null,
        session_exercise_id: parsed.data.sessionExerciseId ?? null,
        location: parsed.data.location,
        severity: parsed.data.severity,
        note: parsed.data.note ?? null,
      })
      .select('id')
      .single()

    if (error || !data) {
      logServerError('logPain', error)
      return { ok: false, message: 'Could not save pain note.' }
    }

    return { ok: true, data: { id: data.id } }
  } catch (err) {
    logServerError('logPain', err)
    return { ok: false, message: 'Unexpected error.' }
  }
}

export async function endSession(
  input: SessionReflectionInput,
): Promise<ActionResult<{ logId: string }>> {
  const parsed = sessionReflectionSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Invalid reflection' }
  }

  try {
    const userId = await getUserId()
    const supabase = createSupabaseServerClient()

    // Make sure a log exists.
    const started = await startSession(parsed.data.sessionId)
    if (!started.ok) return started

    const { data, error } = await supabase
      .from('session_logs')
      .update({
        ended_at: new Date().toISOString(),
        overall_rpe: parsed.data.overallRpe ?? null,
        notes: parsed.data.notes ?? null,
      })
      .eq('session_id', parsed.data.sessionId)
      .eq('profile_id', userId)
      .select('id')
      .single()

    if (error || !data) {
      logServerError('endSession', error)
      return { ok: false, message: 'Could not end session.' }
    }

    return { ok: true, data: { logId: data.id } }
  } catch (err) {
    logServerError('endSession', err)
    return { ok: false, message: 'Unexpected error.' }
  }
}

/** Invalidate the session route so RSC re-fetches logs after a mutation. */
export async function revalidateSession(date: string): Promise<void> {
  revalidatePath(`/session/${date}`)
}
