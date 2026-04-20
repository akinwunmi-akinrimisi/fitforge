import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServiceRoleClient } from '@/lib/supabase/server'
import { getCronSharedSecret } from '@/lib/env'
import { weeklyRecalibrate } from '@/lib/adaptation/orchestrator'
import { lagosDateKey } from '@/lib/dates/lagos'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Weekly recalibration cron endpoint.
 *
 * Invoked by a VPS systemd timer (see docs/build/implementation.md M5) at
 * Sunday 22:59 UTC ≈ Sunday 23:59 Lagos.
 *
 * Auth:   `Authorization: Bearer <CRON_SHARED_SECRET>` required.
 * Scope:  iterates every profile with an active plan and runs the engine
 *         for the week whose Sunday is today's Lagos date (fallback: the
 *         week whose last day matches today's date).
 * Idempotent: existing adaptation rows are returned, not re-written.
 *
 * Optional query params (for manual runs):
 *   ?profileId=<uuid>   — limit to one profile
 *   ?weekNumber=<n>     — override which week to close (default: auto-detect)
 *
 * Response: 200 with a JSON summary on success, 401 on bad auth, 500 on fatal.
 */
export async function POST(request: NextRequest) {
  const auth = request.headers.get('authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  let expected: string
  try {
    expected = getCronSharedSecret()
  } catch {
    return NextResponse.json({ error: 'cron not configured' }, { status: 500 })
  }
  if (!token || token !== expected) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const onlyProfile = url.searchParams.get('profileId')
  const weekOverrideRaw = url.searchParams.get('weekNumber')
  const weekOverride = weekOverrideRaw ? Number(weekOverrideRaw) : null

  const supabase = createSupabaseServiceRoleClient()
  const todayKey = lagosDateKey(new Date())

  // Profiles with an active plan
  let profilesQ = supabase.from('plans').select('profile_id, id, start_date')
  if (onlyProfile) profilesQ = profilesQ.eq('profile_id', onlyProfile)
  const { data: plans, error: plansErr } = await profilesQ
  if (plansErr) {
    return NextResponse.json({ error: `plans lookup failed: ${plansErr.message}` }, { status: 500 })
  }

  const results: Array<{
    profileId: string
    weekNumber: number
    ok: boolean
    decision?: string
    reasoning?: string
    idempotent?: boolean
    error?: string
  }> = []

  for (const plan of plans ?? []) {
    const weekNumber = weekOverride ?? (await inferClosingWeek(supabase, plan.profile_id, todayKey))
    if (!weekNumber) {
      results.push({
        profileId: plan.profile_id,
        weekNumber: 0,
        ok: false,
        error: 'could not infer closing week',
      })
      continue
    }

    const res = await weeklyRecalibrate(supabase, plan.profile_id, weekNumber)
    if (res.ok) {
      results.push({
        profileId: plan.profile_id,
        weekNumber,
        ok: true,
        decision: res.adaptation.decision,
        reasoning: res.adaptation.reasoning,
        idempotent: res.idempotent,
      })
    } else {
      results.push({
        profileId: plan.profile_id,
        weekNumber,
        ok: false,
        error: res.reason,
      })
    }
  }

  return NextResponse.json({
    ranAt: new Date().toISOString(),
    count: results.length,
    results,
  })
}

export async function GET() {
  return NextResponse.json(
    { error: 'use POST with Authorization: Bearer <secret>' },
    { status: 405 },
  )
}

/** Find the week whose last session_date is ≤ today (i.e. the week that just closed). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function inferClosingWeek(
  supabase: Awaited<ReturnType<typeof createSupabaseServiceRoleClient>>,
  profileId: string,
  todayKey: string,
): Promise<number | null> {
  const { data } = await supabase
    .from('sessions')
    .select('day_number, session_date, week_id, weeks!inner(number)')
    .eq('profile_id', profileId)
    .lte('session_date', todayKey)
    .order('session_date', { ascending: false })
    .limit(1)
  const row = data?.[0] as { weeks?: { number?: number } } | undefined
  return row?.weeks?.number ?? null
}
