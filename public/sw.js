/* FitForge90 service worker — offline fallback + push handler stub. */
/* Bump VERSION whenever manifest/icons/offline page change so old SW caches flush. */
const VERSION = 'v2'
const CACHE = `fitforge-${VERSION}`
const OFFLINE_FALLBACK = '/offline.html'
const PRECACHE = [
  OFFLINE_FALLBACK,
  '/manifest.webmanifest',
  '/robots.txt',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).catch(() => {}),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  // Network-first for navigation; fall back to offline page.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).catch(async () => {
        const cache = await caches.open(CACHE)
        return (await cache.match(OFFLINE_FALLBACK)) ?? new Response('offline', { status: 503 })
      }),
    )
    return
  }

  // Cache-first for same-origin static assets.
  const url = new URL(req.url)
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ??
          fetch(req).then((res) => {
            if (res.ok && res.type === 'basic') {
              const clone = res.clone()
              caches.open(CACHE).then((c) => c.put(req, clone))
            }
            return res
          }),
      ),
    )
  }
})

// --- push ------------------------------------------------------------------
// Actual push delivery requires a VAPID key pair + a server-side subscription
// store + scheduler. This handler is compatible with a future payload shape:
//   { title: string, body: string, url?: string }
self.addEventListener('push', (event) => {
  let payload = { title: 'FitForge90', body: 'Time to move.' }
  try {
    if (event.data) payload = { ...payload, ...event.data.json() }
  } catch {
    /* ignore */
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: payload.url ?? '/mobility' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/'
  event.waitUntil(self.clients.openWindow(url))
})
