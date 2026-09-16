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
