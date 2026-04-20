'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'

type Result<T = void> =
  | (T extends void ? { ok: true } : { ok: true; data: T })
  | { ok: false; message: string }

const profileEditSchema = z
  .object({
    weightKg: z.number().min(30).max(400).optional(),
    sessionsPerWeek: z.number().int().min(1).max(7).optional(),
    notificationTimes: z
      .array(z.string().regex(/^\d{2}:\d{2}$/))
      .max(8)
      .optional(),
  })
  .strict()

export async function updateProfileSettings(
  input: z.infer<typeof profileEditSchema>,
): Promise<Result> {
  const parsed = profileEditSchema.safeParse(input)
  if (!parsed.success) return { ok: false, message: 'Invalid input.' }
  try {
    const supabase = createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { ok: false, message: 'Not authenticated.' }

    const update: Record<string, unknown> = {}
    if (parsed.data.weightKg !== undefined) update.weight_kg = parsed.data.weightKg
    if (parsed.data.sessionsPerWeek !== undefined)
      update.sessions_per_week = parsed.data.sessionsPerWeek
    if (parsed.data.notificationTimes !== undefined)
      update.notification_times = parsed.data.notificationTimes

    if (Object.keys(update).length === 0) return { ok: true }

    const { error } = await supabase.from('profiles').update(update).eq('id', user.id)
    if (error) return { ok: false, message: 'Could not update profile.' }
    revalidatePath('/settings')
    return { ok: true }
  } catch {
    return { ok: false, message: 'Unexpected error.' }
  }
}
