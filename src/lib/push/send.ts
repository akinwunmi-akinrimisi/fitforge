import 'server-only'
import webpush from 'web-push'

export type PushPayload = { title: string; body: string; url?: string }

let configured = false
function configure(): boolean {
  if (configured) return true
  const pub = process.env.VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  const subject = process.env.VAPID_SUBJECT || 'mailto:ops@fitforge.operscale.cloud'
  if (!pub || !priv) return false
  webpush.setVapidDetails(subject, pub, priv)
  configured = true
  return true
}

export type PushSubscriptionLike = {
  endpoint: string
  keys: { p256dh: string; auth: string }
}

export async function sendPush(
  subscription: PushSubscriptionLike,
  payload: PushPayload,
): Promise<{ ok: true } | { ok: false; statusCode?: number; message: string }> {
  if (!configure()) return { ok: false, message: 'VAPID keys missing' }
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload))
    return { ok: true }
  } catch (err) {
    // 404/410 = subscription no longer valid; caller should delete it.
    const e = err as { statusCode?: number; message?: string }
    const msg = e.message ?? 'push failed'
    return e.statusCode !== undefined
      ? { ok: false, statusCode: e.statusCode, message: msg }
      : { ok: false, message: msg }
  }
}
