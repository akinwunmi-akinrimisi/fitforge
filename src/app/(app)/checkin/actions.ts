'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { dailyCheckinInputSchema, type DailyCheckinInput } from '@/domain/checkin'

type ActionResult<T = void> =
  | (T extends void ? { ok: true } : { ok: true; data: T })
  | { ok: false; message: string }

export async function submitCheckin(
  input: DailyCheckinInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = dailyCheckinInputSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Invalid check-in' }
  }
  try {
    const supabase = createSupabaseServerClient()
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser()
    if (authErr || !user) return { ok: false, message: 'Not authenticated.' }

    const { data, error } = await supabase
      .from('daily_checkins')
      .upsert(
        {
          profile_id: user.id,
          check_date: parsed.data.checkDate,
          sleep_hours: parsed.data.sleepHours ?? null,
          energy: parsed.data.energy ?? null,
          soreness: parsed.data.soreness ?? null,
          note: parsed.data.note ?? null,
          logged_at: new Date().toISOString(),
        },
        { onConflict: 'profile_id,check_date' },
      )
      .select('id')
      .single()

    if (error || !data) {
      // eslint-disable-next-line no-console
      console.error('[action submitCheckin]', { name: error?.code })
      return { ok: false, message: 'Could not save check-in.' }
    }

    revalidatePath('/checkin')
    revalidatePath('/dashboard')
    return { ok: true, data: { id: data.id } }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[action submitCheckin]', { name: err instanceof Error ? err.name : 'unknown' })
    return { ok: false, message: 'Unexpected error.' }
  }
}
