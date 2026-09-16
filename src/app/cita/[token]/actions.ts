'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function cancelarCita(formData: FormData) {
  const token = String(formData.get('token') ?? '')
  if (!token) return

  const supabase = await createClient()
  await supabase.rpc('cancel_appointment', { p_token: token })
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
  revalidatePath(`/cita/${token}`)
  return undefined
}
