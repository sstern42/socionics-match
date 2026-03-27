const CACHE = 'socion-v1'

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
