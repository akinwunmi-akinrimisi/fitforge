'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { flushQueue } from '@/lib/offline/sync'
import { queueSize } from '@/lib/offline/queue'

/**
 * Registers the service worker and auto-flushes the offline set-log queue
 * whenever the browser reports `online`. Mounted once in the (app) layout.
 */
export function PwaRegister() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then(() => setReady(true))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!ready) return
    async function drain() {
      try {
        const pending = await queueSize()
        if (pending === 0) return
        const res = await flushQueue()
        if (res.synced > 0) toast.success(`${res.synced} offline sets synced`)
        if (res.failed > 0) toast.error(`${res.failed} still queued — try again when online`)
      } catch {
        /* ignore */
      }
    }
    // Flush on mount (covers "came back online before SPA boot") + on online events.
    void drain()
    window.addEventListener('online', drain)
    return () => window.removeEventListener('online', drain)
  }, [ready])

  return null
}
