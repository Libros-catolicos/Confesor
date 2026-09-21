import 'server-only'
import { createClient } from '@supabase/supabase-js'

/**
 * Cliente con la clave de servicio: salta RLS. SOLO en código de servidor y
 * solo para las tablas sin acceso de cliente (consent_log, newsletter_subscribers,
 * contact_attempts) y para tareas programadas. Nunca exponer.
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SECRET_KEY
  if (!key) throw new Error('Falta SUPABASE_SECRET_KEY')
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
