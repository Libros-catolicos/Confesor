'use server'

import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { notificarRespuestaFiel } from '@/lib/notificaciones'
import { createClient } from '@/lib/supabase/server'

export async function cancelarCita(formData: FormData) {
  const token = String(formData.get('token') ?? '')
  if (!token) return

  const supabase = await createClient()
  const { data } = await supabase.rpc('cancel_appointment', { p_token: token })
  if (data) after(() => notificarRespuestaFiel(token))
  revalidatePath(`/cita/${token}`)
}

export async function cambiarRecordatorio(formData: FormData) {
  const token = String(formData.get('token') ?? '')
  const enabled = formData.get('enabled') === 'true'
  if (!token) return
  const supabase = await createClient()
  await supabase.rpc('set_reminder_by_token', { p_token: token, p_enabled: enabled })
  revalidatePath(`/cita/${token}`)
}

export type PropuestaState = { error?: string } | undefined

export async function aceptarPropuesta(_prev: PropuestaState, formData: FormData): Promise<PropuestaState> {
  const token = String(formData.get('token') ?? '')
  if (!token) return { error: 'Enlace no válido.' }

  const supabase = await createClient()
  const { error } = await supabase.rpc('accept_proposed_time', { p_token: token })
  if (error) {
    return {
      error: error.message.includes('disponible')
        ? 'Esa hora ya no está disponible. Puedes reservar otra desde la ficha del sacerdote.'
        : 'No se ha podido aceptar la propuesta.',
    }
  }
  after(() => notificarRespuestaFiel(token))
  revalidatePath(`/cita/${token}`)
  return undefined
}
