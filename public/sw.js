const CACHE = 'socion-v2'

const SHELL = [
  '/',
  '/index.html',
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(SHELL))
  )
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return

  // Never intercept Supabase or external API calls
  const url = new URL(event.request.url)
  if (!url.origin.includes('socion.app')) return

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Cache fresh HTML responses (navigation requests)
        if (event.request.mode === 'navigate') {
          const clone = response.clone()
          caches.open(CACHE).then(cache => cache.put(event.request, clone))
        }
        return response
      })
      .catch(() => {
        // Offline fallback — serve cached shell
        return caches.match('/index.html')
      })
  )
})

// Push notification received
self.addEventListener('push', event => {
  const data = event.data?.json() ?? {}

  event.waitUntil(
    // Don't show notification if the app is already open and visible
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      const appVisible = clientList.some(c => c.visibilityState === 'visible')
      if (appVisible) return

      return self.registration.showNotification(data.title ?? 'New message', {
        body: data.body ?? 'You have a new message on Socion',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        data: { url: data.url ?? '/messages' },
        tag: data.tag ?? 'socion-message',
        renotify: true,
      })
    })
  )
})

// Notification clicked — open or focus the app
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
