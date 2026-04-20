import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServiceRoleClient } from '@/lib/supabase/server'
import { getCronSharedSecret } from '@/lib/env'
import { sendPush, type PushSubscriptionLike } from '@/lib/push/send'
import { formatLagos } from '@/lib/dates/lagos'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Fires every 15 minutes. Sends a mobility-break push to every user whose
 * `profiles.notification_times` contains the current Lagos HH:MM (rounded
 * down to the nearest 15-min mark).
 *
 * Auth: Bearer CRON_SHARED_SECRET.
 */
export async function POST(request: NextRequest) {
  const token = (request.headers.get('authorization') ?? '').replace('Bearer ', '')
  let expected: string
  try {
    expected = getCronSharedSecret()
  } catch {
    return NextResponse.json({ error: 'cron not configured' }, { status: 500 })
  }
  if (token !== expected) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const now = new Date()
  const hh = formatLagos(now, 'HH')
  const mmRaw = Number(formatLagos(now, 'mm'))
  const mm = String(Math.floor(mmRaw / 15) * 15).padStart(2, '0')
  const currentSlot = `${hh}:${mm}`

  const supabase = createSupabaseServiceRoleClient()
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, notification_times, push_subscriptions')
    .contains('notification_times', [currentSlot])

  const results: Array<{ profileId: string; sent: number; invalid: number }> = []
  for (const p of profiles ?? []) {
    const subs: PushSubscriptionLike[] = Array.isArray(p.push_subscriptions)
      ? p.push_subscriptions
      : []
    let sent = 0
    let invalid = 0
    const survivors: PushSubscriptionLike[] = []
    for (const sub of subs) {
      const res = await sendPush(sub, {
        title: 'Mobility break',
        body: 'Ninety seconds. Stand up, unlock your hips.',
        url: '/mobility',
      })
      if (res.ok) {
        sent++
        survivors.push(sub)
      } else if (res.statusCode === 404 || res.statusCode === 410) {
        invalid++
      } else {
        // Keep the subscription but don't count as sent; transient error.
        survivors.push(sub)
      }
    }
    if (invalid > 0) {
      await supabase.from('profiles').update({ push_subscriptions: survivors }).eq('id', p.id)
    }
    results.push({ profileId: p.id, sent, invalid })
  }

  return NextResponse.json({ slot: currentSlot, ranAt: now.toISOString(), results })
}

export async function GET() {
  return NextResponse.json({ error: 'use POST with bearer auth' }, { status: 405 })
}
