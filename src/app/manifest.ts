import type { MetadataRoute } from 'next'

// Manifiesto de la aplicación instalable (PWA). Con esto, Android y iOS pueden
// añadir Confesor a la pantalla de inicio y abrirlo como una app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Confesor',
    short_name: 'Confesor',
    description:
      'Encuentra sacerdotes cerca de ti para confesarte o hablar y reserva cita: no es necesario registrarse.',
    lang: 'es',
    dir: 'ltr',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#faf8f5',
    theme_color: '#5b2a86',
    categories: ['lifestyle', 'social'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Buscar sacerdote', short_name: 'Buscar', url: '/buscar' },
      { name: 'Recursos', short_name: 'Recursos', url: '/recursos' },
    ],
  }
}
