import type { MetadataRoute } from 'next'
import { siteUrl } from '@/lib/site'

// Lo privado no se rastrea. Importa sobre todo /cita/: esas páginas llevan el
// nombre del fiel y su enlace secreto, y no deben aparecer en ningún buscador.
const PRIVADO = [
  '/admin/',
  '/api/',
  '/auth/',
  '/baja',
  '/cita/',
  '/cuenta/',
  '/login',
  '/mi-cuenta',
  '/panel/',
  '/recuperar',
  '/sin-conexion',
]

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl()
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: PRIVADO }],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}
