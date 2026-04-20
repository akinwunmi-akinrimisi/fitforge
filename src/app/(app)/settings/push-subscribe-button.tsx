'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Bell, BellOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function PushSubscribeButton({ vapidPublicKey }: { vapidPublicKey: string | null }) {
  const [subscribed, setSubscribed] = useState<boolean | null>(null)
  const [supported, setSupported] = useState(false)
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    if (typeof window === 'undefined') return
    setSupported(
      'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window,
    )
    navigator.serviceWorker?.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((s) => setSubscribed(!!s))
      .catch(() => setSubscribed(false))
  }, [])

  if (!supported) {
    return (
      <p className="text-xs text-muted-foreground">
        Push notifications not supported on this browser.
      </p>
    )
  }

  if (!vapidPublicKey) {
    return (
      <p className="text-xs text-muted-foreground">
        Push is configured on the server but VAPID_PUBLIC_KEY is not exposed — set
        NEXT_PUBLIC_VAPID_PUBLIC_KEY and redeploy.
      </p>
    )
  }

  async function subscribe() {
    try {
      const reg = await navigator.serviceWorker.ready
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        toast.error('Notifications permission denied')
        return
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey!).buffer as ArrayBuffer,
      })
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(sub.toJSON()),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setSubscribed(true)
      toast.success('Subscribed to mobility nudges')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not subscribe')
    }
  }

  async function unsubscribe() {
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (!sub) {
        setSubscribed(false)
        return
      }
      await fetch('/api/push/subscribe', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ endpoint: sub.endpoint }),
      })
      await sub.unsubscribe()
      setSubscribed(false)
      toast.success('Unsubscribed')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not unsubscribe')
    }
  }

  return (
    <Button
      type="button"
      variant={subscribed ? 'outline' : 'default'}
      size="sm"
      onClick={() =>
        startTransition(() => {
          void (subscribed ? unsubscribe() : subscribe())
        })
      }
      disabled={pending || subscribed === null}
    >
      {subscribed ? <BellOff className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
      <span className="text-xs uppercase tracking-widest">
        {subscribed === null ? 'Checking…' : subscribed ? 'Unsubscribe' : 'Enable push'}
      </span>
    </Button>
  )
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const normalized = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(normalized)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}
