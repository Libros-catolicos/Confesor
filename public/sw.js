// Service worker de Confesor.
//
// Regla de privacidad: NO se guarda ninguna página en el dispositivo. Las citas,
// el panel y la cuenta contienen datos personales, así que todo lo que sea
// navegación va siempre a la red; si no hay conexión se muestra /sin-conexion.
// Solo se cachean los recursos estáticos (JS, CSS, tipografías, iconos), que son
// iguales para todo el mundo.

const VERSION = 'confesor-v1'
const ESTATICOS = `${VERSION}-estaticos`
const SIN_CONEXION = '/sin-conexion'
const PRECARGA = [SIN_CONEXION, '/icon-192.png']
const DEV = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(ESTATICOS)
      .then((cache) => cache.addAll(PRECARGA))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((claves) => Promise.all(claves.filter((c) => !c.startsWith(VERSION)).map((c) => caches.delete(c))))
      .then(() => self.clients.claim())
  )
})

// Permite que una versión nueva se active sin esperar a cerrar todas las pestañas
self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting()
})

function esEstatico(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icon-') ||
    url.pathname === '/apple-icon.png' ||
    url.pathname === '/favicon.ico' ||
    /\.(css|js|woff2?|png|jpg|jpeg|svg|webp)$/.test(url.pathname)
  )
}

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  // Navegaciones: siempre red. Sin conexión, página de cortesía.
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match(SIN_CONEXION)))
    return
  }

  // Estáticos: primero la caché (en desarrollo no, para no servir código viejo)
  if (!DEV && esEstatico(url)) {
    event.respondWith(
      caches.match(req).then(
        (guardado) =>
          guardado ??
          fetch(req).then((res) => {
            if (res.ok) {
              const copia = res.clone()
              caches.open(ESTATICOS).then((cache) => cache.put(req, copia))
            }
            return res
          })
      )
    )
  }
})
