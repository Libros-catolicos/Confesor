import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/** Devuelve el cliente y el usuario si es admin; si no, redirige. Usar en páginas y actions de /admin. */
export async function requireAdmin() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/admin')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  if (profile?.role !== 'admin') redirect('/panel')

  return { supabase, user }
}
