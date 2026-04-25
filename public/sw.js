const CACHE_NAME = 'aegis-shell-v1'
const APP_SHELL_ASSETS = [
  '/',
  '/dashboard',
  '/site.webmanifest',
  '/favicon.ico',
  '/favicon.svg',
  '/pwa/icon-192.png',
  '/pwa/icon-512.png',
  '/pwa/icon-maskable-512.png',
  '/pwa/apple-touch-icon.png'
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL_ASSETS)).catch(() => undefined)
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (request.method !== 'GET') {
    return
  }

  const url = new URL(request.url)

  if (url.origin !== self.location.origin) {
    return
  }

  if (url.pathname.startsWith('/api/')) {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cachedDashboard = await caches.match('/dashboard')
        return cachedDashboard || caches.match('/')
      })
    )
    return
  }

  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/pwa/') ||
    url.pathname === '/site.webmanifest' ||
    url.pathname === '/favicon.ico' ||
    url.pathname === '/favicon.svg'
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          return cached
        }

        return fetch(request).then((response) => {
          const cloned = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned)).catch(() => undefined)
          return response
        })
      })
    )
  }
})
