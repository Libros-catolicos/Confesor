import 'server-only'
import { createHash, randomBytes } from 'node:crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { LEGAL_VERSION, type ConsentKind, type SubjectType } from '@/lib/legal'

/** SHA-256 del email en minúsculas con sal de servidor. Sin la sal no se puede revertir por diccionario. */
export function hashEmail(email: string) {
  const salt = process.env.CONSENT_SALT
  if (!salt) console.warn('[consentimiento] CONSENT_SALT no configurada; usando sal de desarrollo')
  return createHash('sha256')
    .update(`${salt ?? 'dev-salt'}:${email.trim().toLowerCase()}`)
    .digest('hex')
}

export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

interface Registro {
  subjectType: SubjectType
  subjectId?: string | null
  email: string
  kind: ConsentKind
  text: string
  action?: 'granted' | 'withdrawn'
}

/** Inserta en consent_log (solo inserción). Nunca falla la operación principal por esto: registra el error. */
export async function registrarConsentimiento(r: Registro) {
  try {
    const db = createAdminClient()
    const { error } = await db.from('consent_log').insert({
      subject_type: r.subjectType,
      subject_id: r.subjectId ?? null,
      email_hash: hashEmail(r.email),
      consent_kind: r.kind,
      legal_version: LEGAL_VERSION,
      consent_text: r.text,
      action: r.action ?? 'granted',
    })
    if (error) console.error('[consentimiento] insert:', error.message)
  } catch (e) {
    console.error('[consentimiento]', e)
  }
}

/** Alta en la lista de correo (idempotente). Devuelve true si se creó o ya existía activa. */
export async function suscribirNewsletter(email: string, name: string | null, source: 'booking' | 'faithful' | 'priest') {
  try {
    const db = createAdminClient()
    const correo = email.trim().toLowerCase()
    const { data: existente } = await db
      .from('newsletter_subscribers')
      .select('id')
      .ilike('email', correo)
      .is('unsubscribed_at', null)
      .maybeSingle()
    if (existente) return true

    const token = randomBytes(32).toString('base64url')
    const { error } = await db.from('newsletter_subscribers').insert({
      email: correo,
      name,
      source,
      unsubscribe_token_hash: hashToken(token),
    })
    if (error) {
      console.error('[newsletter] alta:', error.message)
      return false
    }
    // El token en claro solo existe aquí; se guarda hasheado. Si algún día se envía
    // por correo, se genera en el momento del envío con el mismo esquema.
    return true
  } catch (e) {
    console.error('[newsletter]', e)
    return false
  }
}

/** ¿Está el email suscrito y activo? (para decidir en servidor si va bloque comercial) */
export async function estaSuscrito(email: string | null | undefined) {
  if (!email) return false
  try {
    const db = createAdminClient()
    const { data } = await db
      .from('newsletter_subscribers')
      .select('id')
      .ilike('email', email.trim().toLowerCase())
      .is('unsubscribed_at', null)
      .maybeSingle()
    return Boolean(data)
  } catch {
    return false
  }
}

/** Baja por token. Anonimiza la fila (email y nombre a null) y conserva fechas. */
export async function bajaNewsletterPorToken(token: string) {
  const db = createAdminClient()
  const { data } = await db
    .from('newsletter_subscribers')
    .select('id, email')
    .eq('unsubscribe_token_hash', hashToken(token))
    .is('unsubscribed_at', null)
    .maybeSingle()
  if (!data) return false
  await db
    .from('newsletter_subscribers')
    .update({ email: null, name: null, unsubscribed_at: new Date().toISOString() })
    .eq('id', data.id)
  if (data.email) {
    await registrarConsentimiento({
      subjectType: 'newsletter',
      subjectId: data.id,
      email: data.email,
      kind: 'newsletter',
      text: 'Baja de la lista de recomendaciones de libros',
      action: 'withdrawn',
    })
  }
  return true
}

/** Baja por email (al borrar cuenta, si el usuario lo marca). */
export async function bajaNewsletterPorEmail(email: string) {
  const db = createAdminClient()
  const { data } = await db
    .from('newsletter_subscribers')
    .select('id')
    .ilike('email', email.trim().toLowerCase())
    .is('unsubscribed_at', null)
    .maybeSingle()
  if (!data) return
  await db
    .from('newsletter_subscribers')
    .update({ email: null, name: null, unsubscribed_at: new Date().toISOString() })
    .eq('id', data.id)
  await registrarConsentimiento({
    subjectType: 'newsletter',
    subjectId: data.id,
    email,
    kind: 'newsletter',
    text: 'Baja de la lista al eliminar la cuenta',
    action: 'withdrawn',
  })
}

/** Genera (y guarda) un token de baja nuevo para incluir en un correo. */
export async function tokenDeBaja(email: string): Promise<string | null> {
  try {
    const db = createAdminClient()
    const { data } = await db
      .from('newsletter_subscribers')
      .select('id')
      .ilike('email', email.trim().toLowerCase())
      .is('unsubscribed_at', null)
      .maybeSingle()
    if (!data) return null
    const token = randomBytes(32).toString('base64url')
    await db.from('newsletter_subscribers').update({ unsubscribe_token_hash: hashToken(token) }).eq('id', data.id)
    return token
  } catch {
    return null
  }
}
