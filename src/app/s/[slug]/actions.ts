'use server'

import { redirect } from 'next/navigation'
import { after } from 'next/server'
import { notificarNuevaCita } from '@/lib/notificaciones'
import { createClient } from '@/lib/supabase/server'
import type { SlotType } from '@/lib/types'

export type ReservaState = { error?: string } | undefined

export async function reservar(_prev: ReservaState, formData: FormData): Promise<ReservaState> {
  const priestId = String(formData.get('priest_id') ?? '')
  const placeId = String(formData.get('place_id') ?? '')
  const startsAt = String(formData.get('starts_at') ?? '')
  const type = String(formData.get('type') ?? '') as SlotType
  const language = String(formData.get('language') ?? '')
  const name = String(formData.get('guest_name') ?? '').trim()
  const email = String(formData.get('guest_email') ?? '').trim()
  const phone = String(formData.get('guest_phone') ?? '').trim()

  if (!priestId || !placeId || !startsAt || !type) return { error: 'Selecciona un hueco.' }
  if (name.length < 2) return { error: 'Indica tu nombre (puede ser solo el nombre de pila).' }
  if (!email && !phone) return { error: 'Indica un email o un teléfono para confirmarte la cita.' }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'El email no parece válido.' }

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('book_appointment', {
    p_priest_id: priestId,
    p_place_id: placeId,
    p_starts_at: startsAt,
    p_type: type,
    p_language: language,
    p_guest_name: name,
    p_guest_email: email || null,
    p_guest_phone: phone || null,
  })

  if (error) {
    // Los mensajes de las excepciones SQL están pensados para mostrarse al usuario
    const msg = error.message.includes('hueco')
      ? 'Ese hueco acaba de ocuparse. Elige otro, por favor.'
      : error.message
    return { error: msg }
  }

  const row = (Array.isArray(data) ? data[0] : data) as { manage_token: string } | undefined
  if (!row?.manage_token) return { error: 'No se ha podido completar la reserva.' }

  after(() => notificarNuevaCita(row.manage_token))
  redirect(`/cita/${row.manage_token}?nueva=1`)
}
