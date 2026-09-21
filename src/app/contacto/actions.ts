'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { hashEmail } from '@/lib/consentimiento'
import { enviarEmail } from '@/lib/email'

export type ContactoState = { error?: string; ok?: string } | undefined

const MAX_POR_HORA = 3

export async function enviarContacto(_prev: ContactoState, formData: FormData): Promise<ContactoState> {
  // Honeypot: campo oculto que los humanos no rellenan
  if (String(formData.get('website') ?? '')) return { ok: 'Mensaje enviado. Te responderemos por correo.' }

  const nombre = String(formData.get('nombre') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  const mensaje = String(formData.get('mensaje') ?? '').trim()

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Indica un email válido para poder responderte.' }
  if (mensaje.length < 10) return { error: 'Escribe tu mensaje.' }
  if (mensaje.length > 3000) return { error: 'El mensaje es demasiado largo.' }

  // Límite de intentos por email (hash), sin guardar IP ni el propio email
  try {
    const db = createAdminClient()
    const hash = hashEmail(email)
    const hace1h = new Date(Date.now() - 3600e3).toISOString()
    const { count } = await db
      .from('contact_attempts')
      .select('*', { count: 'exact', head: true })
      .eq('email_hash', hash)
      .gte('created_at', hace1h)
    if ((count ?? 0) >= MAX_POR_HORA) return { error: 'Has enviado varios mensajes seguidos. Inténtalo más tarde.' }
    await db.from('contact_attempts').insert({ email_hash: hash })
  } catch (e) {
    console.error('[contacto] límite:', e)
  }

  const destino = process.env.CONTACT_EMAIL ?? 'info@confesor.es'
  const ok = await enviarEmail({
    to: destino,
    replyTo: email,
    subject: `Contacto web: ${nombre || email}`,
    html: `<p><strong>De:</strong> ${nombre ? `${nombre} · ` : ''}${email}</p><p style="white-space:pre-wrap">${mensaje
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')}</p>`,
    text: `De: ${nombre ? `${nombre} · ` : ''}${email}\n\n${mensaje}`,
  })
  if (!ok) return { error: 'No se ha podido enviar el mensaje. Escríbenos directamente a info@confesor.es.' }
  return { ok: 'Mensaje enviado. Te responderemos por correo.' }
}
