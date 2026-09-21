'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin'

export type LibroState = { error?: string; ok?: string } | undefined

const TIPOS = ['image/jpeg', 'image/png', 'image/webp']
const MAX_BYTES = 2 * 1024 * 1024

function leerFormulario(formData: FormData) {
  const url = String(formData.get('url') ?? '').trim()
  return {
    title: String(formData.get('title') ?? '').trim(),
    author: String(formData.get('author') ?? '').trim() || null,
    description: String(formData.get('description') ?? '').trim() || null,
    url: url ? (/^https?:\/\//.test(url) ? url : `https://${url}`) : null,
    featured: formData.get('featured') === 'on',
    affiliate: formData.get('affiliate') === 'on',
    order_index: Number(formData.get('order_index') ?? 99) || 99,
    published: formData.get('published') === 'on',
  }
}

/** Sube la portada al bucket público y devuelve su URL (o null si no se envió fichero) */
async function subirPortada(
  supabase: Awaited<ReturnType<typeof requireAdmin>>['supabase'],
  formData: FormData
): Promise<{ url?: string; error?: string }> {
  const file = formData.get('cover')
  if (!(file instanceof File) || file.size === 0) return {}
  if (!TIPOS.includes(file.type)) return { error: 'La portada debe ser JPG, PNG o WebP.' }
  if (file.size > MAX_BYTES) return { error: 'La portada no puede superar 2 MB.' }

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('portadas').upload(path, file, { contentType: file.type })
  if (error) {
    console.error('[admin] portada:', error.message)
    return { error: 'No se ha podido subir la portada.' }
  }
  return { url: supabase.storage.from('portadas').getPublicUrl(path).data.publicUrl }
}

export async function guardarLibro(_prev: LibroState, formData: FormData): Promise<LibroState> {
  const id = String(formData.get('id') ?? '')
  const v = leerFormulario(formData)
  if (v.title.length < 2) return { error: 'Indica el título.' }

  const { supabase } = await requireAdmin()
  const portada = await subirPortada(supabase, formData)
  if (portada.error) return { error: portada.error }

  const quitarPortada = formData.get('remove_cover') === 'on'
  const datos = {
    ...v,
    ...(portada.url ? { cover_url: portada.url } : quitarPortada ? { cover_url: null } : {}),
  }

  const { error } = id
    ? await supabase.from('books').update(datos).eq('id', id)
    : await supabase.from('books').insert(datos)
  if (error) {
    console.error('[admin] libro:', error.message)
    return { error: 'No se ha podido guardar el libro.' }
  }

  revalidatePath('/recursos')
  revalidatePath('/admin/libros')
  return { ok: id ? 'Guardado.' : 'Libro añadido.' }
}

export async function borrarLibro(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  if (!id) return
  const { supabase } = await requireAdmin()
  await supabase.from('books').delete().eq('id', id)
  revalidatePath('/recursos')
  revalidatePath('/admin/libros')
}
