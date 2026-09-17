// Contenido editorial de /recursos, gestionado desde /admin (tablas articles y books).

import { marked } from 'marked'
import { createClient } from '@/lib/supabase/server'
import { type Article, type Book } from '@/lib/contenido'

export * from '@/lib/contenido'

/** Artículos publicados (RLS: el admin ve también los no publicados) */
export async function listarArticulos(): Promise<Article[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('articles')
    .select('*')
    .order('section')
    .order('order_index')
    .order('title')
    .returns<Article[]>()
  return data ?? []
}

export async function leerArticulo(slug: string): Promise<(Article & { html: string }) | null> {
  if (!/^[a-z0-9-]+$/.test(slug)) return null
  const supabase = await createClient()
  const { data } = await supabase.from('articles').select('*').eq('slug', slug).maybeSingle<Article>()
  if (!data) return null
  return { ...data, html: await marked.parse(data.body_md) }
}

export async function listarLibros(): Promise<Book[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('books')
    .select('*')
    .order('featured', { ascending: false })
    .order('order_index')
    .order('title')
    .returns<Book[]>()
  return data ?? []
}

