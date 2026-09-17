'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin'
import { SECCIONES, slugify } from '@/lib/contenido'

export type ArticuloState = { error?: string; ok?: string } | undefined

function leerFormulario(formData: FormData) {
  const title = String(formData.get('title') ?? '').trim()
  const slugRaw = String(formData.get('slug') ?? '').trim()
  return {
    title,
    slug: slugify(slugRaw || title),
    summary: String(formData.get('summary') ?? '').trim() || null,
    section: String(formData.get('section') ?? 'confesion'),
    body_md: String(formData.get('body_md') ?? '').replace(/\r\n/g, '\n'),
    order_index: Number(formData.get('order_index') ?? 99) || 99,
    published: formData.get('published') === 'on',
  }
}

function validar(v: ReturnType<typeof leerFormulario>) {
  if (v.title.length < 3) return 'Indica un título.'
  if (!v.slug) return 'La URL (slug) no es válida.'
  if (!SECCIONES.some((s) => s.id === v.section)) return 'Sección no válida.'
  if (v.body_md.trim().length < 10) return 'El contenido está vacío.'
  return null
}

function revalidar(slug: string) {
  revalidatePath('/recursos')
  revalidatePath(`/recursos/${slug}`)
  revalidatePath('/admin/recursos')
}

export async function crearArticulo(_prev: ArticuloState, formData: FormData): Promise<ArticuloState> {
  const v = leerFormulario(formData)
  const err = validar(v)
  if (err) return { error: err }

  const { supabase } = await requireAdmin()
  const { data, error } = await supabase.from('articles').insert(v).select('id').single()
  if (error) {
    return { error: error.code === '23505' ? 'Ya existe un artículo con esa URL.' : 'No se ha podido crear.' }
  }
  revalidar(v.slug)
  redirect(`/admin/recursos/${data.id}?ok=1`)
}

export async function guardarArticulo(_prev: ArticuloState, formData: FormData): Promise<ArticuloState> {
  const id = String(formData.get('id') ?? '')
  const v = leerFormulario(formData)
  const err = validar(v)
  if (err) return { error: err }

  const { supabase } = await requireAdmin()
  const { data: antes } = await supabase.from('articles').select('slug').eq('id', id).maybeSingle()
  const { error } = await supabase.from('articles').update(v).eq('id', id)
  if (error) {
    return { error: error.code === '23505' ? 'Ya existe un artículo con esa URL.' : 'No se ha podido guardar.' }
  }
  if (antes?.slug) revalidar(antes.slug)
  revalidar(v.slug)
  return { ok: 'Guardado.' }
}

export async function borrarArticulo(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  if (!id) return
  const { supabase } = await requireAdmin()
  const { data } = await supabase.from('articles').select('slug').eq('id', id).maybeSingle()
  await supabase.from('articles').delete().eq('id', id)
  if (data?.slug) revalidar(data.slug)
  redirect('/admin/recursos')
}
