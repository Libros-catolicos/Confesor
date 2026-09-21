'use server'

import { redirect } from 'next/navigation'
import { after } from 'next/server'
import { notificarNuevaCita } from '@/lib/notificaciones'
import { createClient } from '@/lib/supabase/server'
import type { SlotType } from '@/lib/types'
import { CONSENT_TEXT } from '@/lib/legal'
import { registrarConsentimiento, suscribirNewsletter } from '@/lib/consentimiento'

export type ReservaState = { error?: string } | undefined

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function reservar(_prev: ReservaState, formData: FormData): Promise<ReservaState> {
  const priestId = String(formData.get('priest_id') ?? '')
  const placeId = String(formData.get('place_id') ?? '')
  const startsAt = String(formData.get('starts_at') ?? '')
  const type = String(formData.get('type') ?? '') as SlotType
  const language = String(formData.get('language') ?? '')
  const name = String(formData.get('guest_name') ?? '').trim()
  const email = String(formData.get('guest_email') ?? '').trim()
  const phone = String(formData.get('guest_phone') ?? '').trim()
  const consent = formData.get('consent') === 'on'
  const forMinor = formData.get('for_minor') === 'on'
  const reminder = formData.get('reminder') === 'on'
  const newsletter = formData.get('newsletter') === 'on'

  if (!priestId || !placeId || !startsAt || !type) return { error: 'Selecciona un hueco.' }
  if (name.length < 2) return { error: 'Indica tu nombre (puede ser solo el nombre de pila).' }
  if (!email && !phone) return { error: 'Indica un email o un teléfono para confirmarte la cita.' }
  if (email && !EMAIL_RE.test(email)) return { error: 'El email no parece válido.' }
  if (!consent) return { error: 'Para reservar necesitamos tu consentimiento expreso.' }
  if (newsletter && !email) return { error: 'Para suscribirte a las recomendaciones necesitamos tu email.' }

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
    p_for_minor: forMinor,
    p_reminder: reminder,
  })

  if (error) {
    // Los mensajes de las excepciones SQL están pensados para mostrarse al usuario
    const msg = error.message.includes('hueco')
      ? 'Ese hueco acaba de ocuparse. Elige otro, por favor.'
      : error.message
    return { error: msg }
  }

  const row = (Array.isArray(data) ? data[0] : data) as { appointment_id: string; manage_token: string } | undefined
  if (!row?.manage_token) return { error: 'No se ha podido completar la reserva.' }

  // Prueba del consentimiento (solo inserción; nunca bloquea la reserva)
  const sujeto = email || phone
  await registrarConsentimiento({ subjectType: 'booking', subjectId: row.appointment_id, email: sujeto, kind: 'service', text: CONSENT_TEXT.booking })
  if (forMinor) {
    await registrarConsentimiento({ subjectType: 'booking', subjectId: row.appointment_id, email: sujeto, kind: 'minor_guardian', text: CONSENT_TEXT.minor })
  }
  if (reminder && email) {
    await registrarConsentimiento({ subjectType: 'booking', subjectId: row.appointment_id, email, kind: 'reminders', text: CONSENT_TEXT.reminders })
  }
  if (newsletter && email) {
    await suscribirNewsletter(email, name, 'booking')
    await registrarConsentimiento({ subjectType: 'newsletter', email, kind: 'newsletter', text: CONSENT_TEXT.newsletter })
  }

  after(() => notificarNuevaCita(row.manage_token))
  redirect(`/cita/${row.manage_token}?nueva=1`)
}
