'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type CitaState = { error?: string; ok?: string } | undefined

async function actualizarEstado(id: string, status: 'confirmada' | 'completada' | 'no_presentado') {
  const supabase = await createClient()
  const { error } = await supabase.from('appointments').update({ status }).eq('id', id)
  if (error) console.error('[citas] update:', error.message)
  revalidatePath('/panel')
}

export async function confirmarCita(formData: FormData) {
  await actualizarEstado(String(formData.get('id') ?? ''), 'confirmada')
}

export async function marcarCompletada(formData: FormData) {
  await actualizarEstado(String(formData.get('id') ?? ''), 'completada')
}

export async function marcarNoPresentado(formData: FormData) {
  await actualizarEstado(String(formData.get('id') ?? ''), 'no_presentado')
}

/** Cancela la cita; si llega new_starts_at, propone esa hora al fiel. */
export async function cancelarCita(_prev: CitaState, formData: FormData): Promise<CitaState> {
  const id = String(formData.get('id') ?? '')
  const message = String(formData.get('message') ?? '').trim()
  const newStartsAt = String(formData.get('new_starts_at') ?? '')

  if (!id) return { error: 'Cita no válida.' }

  const supabase = await createClient()
  const { error } = await supabase.rpc('priest_cancel_appointment', {
    p_appointment_id: id,
    p_message: message || null,
    p_new_starts_at: newStartsAt || null,
  })
  if (error) {
    console.error('[citas] cancelar:', error.message)
    return { error: error.message.includes('libre') ? 'Esa hora ya no está libre.' : 'No se ha podido cancelar.' }
  }

  // TODO: avisar al fiel por email/SMS (pendiente de SMTP)
  revalidatePath('/panel')
  return { ok: newStartsAt ? 'Propuesta enviada al fiel.' : 'Cita cancelada.' }
}
