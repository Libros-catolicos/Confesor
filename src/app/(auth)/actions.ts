'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { IDIOMAS } from '@/lib/idiomas'

export type AuthState = { error?: string; ok?: string } | undefined

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const next = String(formData.get('next') ?? '/panel')

  if (!email || !password) return { error: 'Introduce email y contraseña.' }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: 'Email o contraseña incorrectos.' }

  redirect(next.startsWith('/') ? next : '/panel')
}

export async function registro(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const fullName = String(formData.get('full_name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const languages = formData
    .getAll('languages')
    .map(String)
    .filter((c) => IDIOMAS.some((i) => i.code === c))

  if (fullName.length < 3) return { error: 'Indica tu nombre completo.' }
  if (!email) return { error: 'Indica tu email.' }
  if (password.length < 8) return { error: 'La contraseña debe tener al menos 8 caracteres.' }
  if (languages.length === 0) return { error: 'Selecciona al menos un idioma.' }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // El trigger handle_new_user crea profiles + priests con estos datos
      data: { full_name: fullName, languages },
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? ''}/auth/callback?next=/panel`,
    },
  })
  if (error) {
    if (error.message.toLowerCase().includes('already')) {
      return { error: 'Ya existe una cuenta con ese email.' }
    }
    console.error('[registro] signUp:', error.code, error.message)
    return { error: 'No se ha podido crear la cuenta. Inténtalo de nuevo.' }
  }

  // Si la confirmación por email está desactivada llega sesión directa
  if (data.session) redirect('/panel')

  return {
    ok: 'Te hemos enviado un email para confirmar la cuenta. Revisa tu bandeja de entrada.',
  }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}
