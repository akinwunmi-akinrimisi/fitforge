'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { todayLagosKey } from '@/lib/dates/lagos'

type ActionResult<T = void> =
  | (T extends void ? { ok: true } : { ok: true; data: T })
  | { ok: false; message: string }

export async function logMobilityBreak(
  breakId: string,
  durationSeconds: number,
): Promise<ActionResult<{ id: string }>> {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0 || durationSeconds > 3600) {
    return { ok: false, message: 'Invalid duration.' }
  }
  try {
    const supabase = createSupabaseServerClient()
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser()
    if (authErr || !user) return { ok: false, message: 'Not authenticated.' }

    const { data, error } = await supabase
      .from('mobility_logs')
      .insert({
        profile_id: user.id,
        mobility_break_id: breakId,
        completed_on: todayLagosKey(),
        duration_seconds: durationSeconds,
      })
      .select('id')
      .single()
    if (error || !data) {
      // eslint-disable-next-line no-console
      console.error('[logMobilityBreak]', { code: error?.code })
      return { ok: false, message: 'Could not save.' }
    }
    revalidatePath('/mobility')
    revalidatePath('/dashboard')
    return { ok: true, data: { id: data.id } }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[logMobilityBreak]', { name: err instanceof Error ? err.name : 'unknown' })
    return { ok: false, message: 'Unexpected error.' }
  }
}
