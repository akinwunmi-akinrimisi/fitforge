import { NextResponse, type NextRequest } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST — save/refresh a PushSubscription on the user's profile.
 * DELETE — remove a subscription by endpoint.
 *
 * Subscriptions live in profiles.push_subscriptions (jsonb array) — stored
 * inline on the profile row so the cron dispatcher can iterate without
 * joining an extra table. Works because one user rarely has >10 devices.
 */
export async function POST(request: NextRequest) {
  const sub = (await request.json().catch(() => null)) as {
    endpoint?: string
    keys?: { p256dh?: string; auth?: string }
  } | null
  if (!sub?.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return NextResponse.json({ error: 'invalid subscription' }, { status: 400 })
  }

  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('push_subscriptions')
    .eq('id', user.id)
    .maybeSingle()

  const current: Array<{ endpoint: string; keys: { p256dh: string; auth: string } }> =
    Array.isArray(profile?.push_subscriptions) ? profile.push_subscriptions : []
  const without = current.filter((s) => s.endpoint !== sub.endpoint)
  const next = [
    ...without,
    { endpoint: sub.endpoint, keys: sub.keys as { p256dh: string; auth: string } },
  ]

  const { error } = await supabase
    .from('profiles')
    .update({ push_subscriptions: next })
    .eq('id', user.id)
  if (error) return NextResponse.json({ error: 'save failed' }, { status: 500 })

  return NextResponse.json({ ok: true, count: next.length })
}

export async function DELETE(request: NextRequest) {
  const body = (await request.json().catch(() => null)) as { endpoint?: string } | null
  if (!body?.endpoint) return NextResponse.json({ error: 'endpoint required' }, { status: 400 })

  const supabase = createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('push_subscriptions')
    .eq('id', user.id)
    .maybeSingle()

  const current: Array<{ endpoint: string }> = Array.isArray(profile?.push_subscriptions)
    ? profile.push_subscriptions
    : []
  const next = current.filter((s) => s.endpoint !== body.endpoint)

  await supabase.from('profiles').update({ push_subscriptions: next }).eq('id', user.id)
  return NextResponse.json({ ok: true, count: next.length })
}
