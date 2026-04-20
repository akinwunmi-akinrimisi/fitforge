'use server'

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  bodyMetricInputSchema,
  isValidCombo,
  photoCommitSchema,
  photoUploadRequestSchema,
  storagePath,
  type BodyMetricInput,
  type PhotoCommitInput,
  type PhotoUploadRequest,
} from '@/domain/progress'

type ActionResult<T = void> =
  | (T extends void ? { ok: true } : { ok: true; data: T })
  | { ok: false; message: string }

async function getUserId(): Promise<string> {
  const supabase = createSupabaseServerClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) throw new Error('Not authenticated')
  return data.user.id
}

function logErr(action: string, err: unknown): void {
  // eslint-disable-next-line no-console
  console.error(`[action ${action}]`, { name: err instanceof Error ? err.name : 'unknown' })
}

// ---------------------------------------------------------------------------
// Body weight + measurements
// ---------------------------------------------------------------------------

export async function upsertBodyMetric(
  input: BodyMetricInput,
): Promise<ActionResult<{ id: string }>> {
  const parsed = bodyMetricInputSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Invalid measurement' }
  }
  try {
    const userId = await getUserId()
    const supabase = createSupabaseServerClient()
    const { data, error } = await supabase
      .from('body_metrics')
      .upsert(
        {
          profile_id: userId,
          measured_on: parsed.data.measuredOn,
          weight_kg: parsed.data.weightKg ?? null,
          waist_cm: parsed.data.waistCm ?? null,
          hip_cm: parsed.data.hipCm ?? null,
          chest_cm: parsed.data.chestCm ?? null,
          neck_cm: parsed.data.neckCm ?? null,
          notes: parsed.data.notes ?? null,
        },
        { onConflict: 'profile_id,measured_on' },
      )
      .select('id')
      .single()
    if (error || !data) {
      logErr('upsertBodyMetric', error)
      return { ok: false, message: 'Could not save.' }
    }
    revalidatePath('/progress')
    revalidatePath('/dashboard')
    return { ok: true, data: { id: data.id } }
  } catch (err) {
    logErr('upsertBodyMetric', err)
    return { ok: false, message: 'Unexpected error.' }
  }
}

// ---------------------------------------------------------------------------
// Photo upload — two-step:
//   1. signedUploadUrl(): client gets a short-lived URL to PUT the WebP to.
//   2. commitPhoto():     client calls this after upload to create the DB row.
// ---------------------------------------------------------------------------

export async function signedUploadUrl(
  input: PhotoUploadRequest,
): Promise<ActionResult<{ url: string; path: string; token: string }>> {
  const parsed = photoUploadRequestSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Invalid upload request' }
  }
  if (!isValidCombo(parsed.data.kind, parsed.data.view)) {
    return { ok: false, message: `Invalid kind/view: ${parsed.data.kind}/${parsed.data.view}` }
  }

  try {
    const userId = await getUserId()
    const supabase = createSupabaseServerClient()
    const path = storagePath(userId, parsed.data.takenOn, parsed.data.kind, parsed.data.view)

    // Remove any prior file at this path (re-upload case).
    await supabase.storage.from('progress-photos').remove([path])

    const { data, error } = await supabase.storage
      .from('progress-photos')
      .createSignedUploadUrl(path)
    if (error || !data) {
      logErr('signedUploadUrl', error)
      return { ok: false, message: 'Could not prepare upload.' }
    }

    return { ok: true, data: { url: data.signedUrl, path, token: data.token } }
  } catch (err) {
    logErr('signedUploadUrl', err)
    return { ok: false, message: 'Unexpected error.' }
  }
}

export async function commitPhoto(input: PhotoCommitInput): Promise<ActionResult<{ id: string }>> {
  const parsed = photoCommitSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? 'Invalid commit' }
  }
  try {
    const userId = await getUserId()
    const supabase = createSupabaseServerClient()

    // Verify the storage_path begins with the caller's UUID — defense in depth
    // against a bug ever allowing a caller to claim someone else's folder.
    if (!parsed.data.storagePath.startsWith(`${userId}/`)) {
      return { ok: false, message: 'storage path does not match authenticated user' }
    }

    const { data, error } = await supabase
      .from('progress_photos')
      .upsert(
        {
          profile_id: userId,
          taken_on: parsed.data.takenOn,
          kind: parsed.data.kind,
          view: parsed.data.view,
          storage_path: parsed.data.storagePath,
          width_px: parsed.data.widthPx ?? null,
          height_px: parsed.data.heightPx ?? null,
          bytes: parsed.data.bytes ?? null,
        },
        { onConflict: 'profile_id,taken_on,kind,view' },
      )
      .select('id')
      .single()
    if (error || !data) {
      logErr('commitPhoto', error)
      return { ok: false, message: 'Could not record photo.' }
    }
    revalidatePath('/progress')
    return { ok: true, data: { id: data.id } }
  } catch (err) {
    logErr('commitPhoto', err)
    return { ok: false, message: 'Unexpected error.' }
  }
}

export async function signedDownloadUrl(path: string): Promise<ActionResult<{ url: string }>> {
  try {
    const userId = await getUserId()
    if (!path.startsWith(`${userId}/`)) {
      return { ok: false, message: 'path mismatch' }
    }
    const supabase = createSupabaseServerClient()
    const { data, error } = await supabase.storage
      .from('progress-photos')
      .createSignedUrl(path, 60 * 60) // 1 hour per security.md §3
    if (error || !data) {
      logErr('signedDownloadUrl', error)
      return { ok: false, message: 'Could not sign URL.' }
    }
    return { ok: true, data: { url: data.signedUrl } }
  } catch (err) {
    logErr('signedDownloadUrl', err)
    return { ok: false, message: 'Unexpected error.' }
  }
}
