'use server'

import { after } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { notificarRespuestaSacerdote } from '@/lib/notificaciones'

export type RespuestaState = { error?: string; ok?: string } | undefined

export async function responderSacerdote(_prev: RespuestaState, formData: FormData): Promise<RespuestaState> {
  const token = String(formData.get('token') ?? '')
  const accion = String(formData.get('accion') ?? '')
  const message = String(formData.get('message') ?? '').trim()
  if (!token || !['confirmar', 'rechazar'].includes(accion)) return { error: 'Acción no válida.' }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('priest_respond_by_token', {
    p_token: token,
    p_action: accion,
    p_message: message || null,
  })
  if (error) return { error: 'No se ha podido registrar la respuesta.' }
  if (!data) return { error: 'La cita ya no está pendiente o ya ha pasado.' }

  after(() => notificarRespuestaSacerdote(token))
  revalidatePath(`/cita/sacerdote/${token}`)
  return { ok: accion === 'confirmar' ? 'Cita confirmada. Hemos avisado al fiel.' : 'Cita rechazada. Hemos avisado al fiel.' }
}
