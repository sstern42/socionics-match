// ─────────────────────────────────────────────────────────────────────────────
// Socion service worker
//
// Cache strategy:
//   /assets/*  → cache-first  (Vite content-hashed filenames, safe forever)
//   navigation → network-first → shell fallback
//   other      → network-first → cache fallback
//
// BUMP CACHE VERSION on significant shell changes (layout, fonts, icons).
// Asset cache never needs bumping — hash changes do that automatically.
// ─────────────────────────────────────────────────────────────────────────────

const SHELL_VERSION = 'socion-shell-v4'
const ASSET_VERSION = 'socion-assets-v1'
const IMAGE_VERSION = 'socion-images-v1'
const ALL_CACHES    = [SHELL_VERSION, ASSET_VERSION, IMAGE_VERSION]

// Pre-cached shell — minimal set that lets the app paint offline
const SHELL_URLS = [
  '/',
  '/index.html',
  '/icon-192.png',
  '/icon-512.png',
  '/manifest.json',
]

// ── Install: pre-cache shell ──────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_VERSION).then(cache => cache.addAll(SHELL_URLS))
  )
  self.skipWaiting()
})

// ── Activate: evict old caches ────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => !ALL_CACHES.includes(k))
          .map(k => caches.delete(k))
      )
    )
  )
  self.clients.claim()
})

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)

  // ── Supabase storage images: cache-first ─────────────────────────────────
  // Avatar and gallery photo URLs include a ?t=<upload-timestamp> query param
  // that changes whenever the user uploads a new image, so cache-first is
  // safe — a new upload automatically gets a new cache key.
  if (
    url.pathname.startsWith('/storage/v1/object/public/') &&
    /\.(jpe?g|png|gif|webp|avif|svg)(\?|$)/i.test(url.pathname + url.search)
  ) {
    event.respondWith(
      caches.open(IMAGE_VERSION).then(async cache => {
        const cached = await cache.match(event.request)
        if (cached) return cached

        try {
          const response = await fetch(event.request)
          if (response.ok) cache.put(event.request, response.clone())
          return response
        } catch {
          return new Response('', { status: 503 })
        }
      })
    )
    return
  }

  // Only handle requests to our own origin — never intercept Supabase APIs,
  // Google Fonts, or any other external service
  if (url.origin !== self.location.origin) return

  // ── Vite hashed assets: cache-first ──────────────────────────────────────
  // /assets/*.js and /assets/*.css have content hashes in their filenames.
  // Once cached they are safe to serve forever — the filename changes when
  // the content changes, so stale files are never accidentally served.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.open(ASSET_VERSION).then(async cache => {
        const cached = await cache.match(event.request)
        if (cached) return cached

        try {
          const response = await fetch(event.request)
          if (response.ok) cache.put(event.request, response.clone())
          return response
        } catch {
          // Asset not cached and offline — nothing we can do
          return new Response('', { status: 503 })
        }
      })
    )
    return
  }

  // ── Navigation requests: network-first, shell fallback ───────────────────
  // Always try the network so users get fresh HTML. On failure, serve the
  // cached shell — React's client-side router handles the rest.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone()
            caches.open(SHELL_VERSION).then(cache => cache.put(event.request, clone))
          }
          return response
        })
        .catch(async () => {
          const cached = await caches.match(event.request)
          return cached ?? caches.match('/index.html')
        })
    )
    return
  }

  // ── Everything else: network-first, cache fallback ────────────────────────
  // Covers static files in /public (icons, screenshots, manifest).
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(SHELL_VERSION).then(cache => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() => caches.match(event.request))
  )
})

// ── Push notification received ────────────────────────────────────────────────
self.addEventListener('push', event => {
  const data = event.data?.json() ?? {}

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      const appVisible = clientList.some(c => c.visibilityState === 'visible')
      if (appVisible) return

      return self.registration.showNotification(data.title ?? 'New message', {
        body:     data.body  ?? 'You have a new message on Socion',
        icon:     '/icon-192.png',
        badge:    '/badge-96.png',
        data:     { url: data.url ?? '/messages' },
        tag:      data.tag  ?? 'socion-message',
        renotify: true,
      })
    })
  )
})

// ── Notification clicked ──────────────────────────────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url ?? '/messages'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url)
          return client.focus()
        }
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
