import type { MetadataRoute } from 'next'
import { createPublicClient } from '@/lib/supabase/publico'
import { siteUrl } from '@/lib/site'

// Se regenera cada hora: los sacerdotes nuevos entran solos en el mapa del sitio.
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl()
  const ahora = new Date()

  const fijas: MetadataRoute.Sitemap = [
    { url: base, lastModified: ahora, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/buscar`, lastModified: ahora, changeFrequency: 'daily', priority: 0.9 },
    { url: `${base}/para-sacerdotes`, lastModified: ahora, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${base}/recursos`, lastModified: ahora, changeFrequency: 'weekly', priority: 0.7 },
    { url: `${base}/contacto`, lastModified: ahora, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/aviso-legal`, lastModified: ahora, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${base}/privacidad`, lastModified: ahora, changeFrequency: 'yearly', priority: 0.2 },
    { url: `${base}/condiciones`, lastModified: ahora, changeFrequency: 'yearly', priority: 0.2 },
  ]

  try {
    const supabase = createPublicClient()
    const [{ data: sacerdotes }, { data: articulos }] = await Promise.all([
      supabase
        .from('priests')
        .select('slug, updated_at')
        .eq('status', 'verificado')
        .returns<{ slug: string; updated_at: string }[]>(),
      supabase
        .from('articles')
        .select('slug, updated_at')
        .eq('published', true)
        .returns<{ slug: string; updated_at: string }[]>(),
    ])

    return [
      ...fijas,
      ...(sacerdotes ?? []).map((p) => ({
        url: `${base}/${p.slug}`,
        lastModified: new Date(p.updated_at),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      })),
      ...(articulos ?? []).map((a) => ({
        url: `${base}/recursos/${a.slug}`,
        lastModified: new Date(a.updated_at),
        changeFrequency: 'monthly' as const,
        priority: 0.6,
      })),
    ]
  } catch (e) {
    // Si la base de datos falla, al menos publicamos las páginas fijas
    console.error('[sitemap]', e)
    return fijas
  }
}
