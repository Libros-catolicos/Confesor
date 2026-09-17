// Constantes y tipos de Recursos compartidos entre servidor y cliente (sin imports de servidor).

export const SECCIONES = [
  { id: 'confesion', titulo: 'Sobre la confesión' },
  { id: 'preparacion', titulo: 'Preparar la confesión' },
  { id: 'dudas', titulo: 'Dudas frecuentes' },
] as const

export type SeccionId = (typeof SECCIONES)[number]['id']

export interface Article {
  id: string
  slug: string
  title: string
  summary: string | null
  section: SeccionId
  body_md: string
  order_index: number
  published: boolean
  created_at: string
  updated_at: string
}

export interface Book {
  id: string
  title: string
  author: string | null
  description: string | null
  url: string | null
  cover_url: string | null
  featured: boolean
  order_index: number
  published: boolean
  created_at: string
  updated_at: string
}

/** "Cómo confesarse, paso a paso" → "como-confesarse-paso-a-paso" */
export function slugify(s: string) {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}
