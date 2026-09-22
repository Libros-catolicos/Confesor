'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { IDIOMAS } from '@/lib/idiomas'
import { MIN_NOTICE_OPTIONS } from '@/lib/types'

export type FichaState = { error?: string; ok?: string } | undefined

export async function guardarFicha(_prev: FichaState, formData: FormData): Promise<FichaState> {
  const displayName = String(formData.get('display_name') ?? '').trim()
  const diocese = String(formData.get('diocese') ?? '').trim()
  const bio = String(formData.get('bio') ?? '').trim()
  const verificationNotes = String(formData.get('verification_notes') ?? '').trim()
  const languages = formData
    .getAll('languages')
    .map(String)
    .filter((c) => IDIOMAS.some((i) => i.code === c))
  const minNotice = Number(formData.get('min_notice_hours') ?? 0)
  const autoConfirm = formData.get('auto_confirm') === 'true'

  if (displayName.length < 3) return { error: 'Indica cómo quieres aparecer (p. ej. "P. Juan Pérez").' }
  if (languages.length === 0) return { error: 'Selecciona al menos un idioma.' }
  if (!MIN_NOTICE_OPTIONS.some((o) => o.value === minNotice)) return { error: 'Antelación no válida.' }
  if (bio.length > 600) return { error: 'La presentación no puede superar los 600 caracteres.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Sesión caducada.' }

  const { error } = await supabase
    .from('priests')
    .update({
      display_name: displayName,
      diocese: diocese || null,
      bio: bio || null,
      languages,
      min_notice_hours: minNotice,
      auto_confirm: autoConfirm,
    })
    .eq('id', user.id)
  if (error) {
    console.error('[ficha] update:', error.message)
    return { error: 'No se han podido guardar los cambios.' }
  }

  const { error: e2 } = await supabase
    .from('priest_private')
    .update({ verification_notes: verificationNotes || null })
    .eq('priest_id', user.id)
  if (e2) console.error('[ficha] private:', e2.message)

  revalidatePath('/panel')
  return { ok: 'Cambios guardados.' }
}

// ---------- Documento de verificación (celebret o equivalente), opcional ----------
const DOC_TIPOS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
}
const DOC_MAX = 5 * 1024 * 1024

export async function subirDocumento(_prev: FichaState, formData: FormData): Promise<FichaState> {
  const file = formData.get('documento')
  if (!(file instanceof File) || file.size === 0) return { error: 'Elige un archivo.' }
  const ext = DOC_TIPOS[file.type]
  if (!ext) return { error: 'Sube una foto (JPG, PNG, WebP) o un PDF.' }
  if (file.size > DOC_MAX) return { error: 'El archivo no puede superar 5 MB.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Sesión caducada.' }

  // Un solo documento por sacerdote: se sustituye el anterior
  const { data: priv } = await supabase.from('priest_private').select('verification_doc_path').eq('priest_id', user.id).maybeSingle()
  const path = `${user.id}/celebret-${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('verificacion').upload(path, file, { contentType: file.type, upsert: false })
  if (error) {
    console.error('[ficha] upload:', error.message)
    return { error: 'No se ha podido subir el archivo.' }
  }
  const { error: e2 } = await supabase
    .from('priest_private')
    .update({ verification_doc_path: path, verification_doc_uploaded_at: new Date().toISOString() })
    .eq('priest_id', user.id)
  if (e2) {
    console.error('[ficha] doc:', e2.message)
    await supabase.storage.from('verificacion').remove([path])
    return { error: 'No se ha podido guardar el documento.' }
  }
  if (priv?.verification_doc_path) await supabase.storage.from('verificacion').remove([priv.verification_doc_path])

  revalidatePath('/panel/ficha')
  return { ok: 'Documento subido. Solo lo verá el equipo de Confesor.' }
}

export async function quitarDocumento(): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return
  const { data: priv } = await supabase.from('priest_private').select('verification_doc_path').eq('priest_id', user.id).maybeSingle()
  if (priv?.verification_doc_path) await supabase.storage.from('verificacion').remove([priv.verification_doc_path])
  await supabase
    .from('priest_private')
    .update({ verification_doc_path: null, verification_doc_uploaded_at: null })
    .eq('priest_id', user.id)
  revalidatePath('/panel/ficha')
}
