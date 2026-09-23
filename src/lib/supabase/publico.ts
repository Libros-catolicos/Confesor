import { createClient } from '@supabase/supabase-js'

/**
 * Cliente sin sesión ni cookies, para lo que se genera fuera de una petición
 * (el mapa del sitio). Solo ve lo que RLS deja ver a cualquiera: sacerdotes
 * verificados y artículos publicados.
 */
export function createPublicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  )
}
