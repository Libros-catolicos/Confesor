'use server'

import { redirect } from 'next/navigation'
import { after } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { IDIOMAS } from '@/lib/idiomas'
import { siteUrl } from '@/lib/site'
import { homeForRole, type UserRole } from '@/lib/types'
import { CONSENT_TEXT } from '@/lib/legal'
import { registrarConsentimiento, suscribirNewsletter } from '@/lib/consentimiento'
import { notificarAltaSacerdote } from '@/lib/notificaciones'

export type AuthState = { error?: string; ok?: string } | undefined

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const next = String(formData.get('next') ?? '/panel')

  if (!email || !password) return { error: 'Introduce email y contraseña.' }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { error: 'Email o contraseña incorrectos.' }

  if (next.startsWith('/') && next !== '/panel') redirect(next)
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).maybeSingle()
  redirect(homeForRole(profile?.role as UserRole | undefined))
}

export async function registro(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const fullName = String(formData.get('full_name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const languages = formData
    .getAll('languages')
    .map(String)
    .filter((c) => IDIOMAS.some((i) => i.code === c))

  const consent = formData.get('consent') === 'on'
  const newsletter = formData.get('newsletter') === 'on'

  if (fullName.length < 3) return { error: 'Indica tu nombre completo.' }
  if (!email) return { error: 'Indica tu email.' }
  if (password.length < 8) return { error: 'La contraseña debe tener al menos 8 caracteres.' }
  if (languages.length === 0) return { error: 'Selecciona al menos un idioma.' }
  if (!consent) return { error: 'Necesitamos tu consentimiento expreso para crear la ficha.' }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // El trigger handle_new_user crea profiles + priests con estos datos
      data: { full_name: fullName, languages },
      emailRedirectTo: `${siteUrl()}/auth/callback?next=/panel`,
    },
  })
  if (error) {
    if (error.message.toLowerCase().includes('already')) {
      return { error: 'Ya existe una cuenta con ese email.' }
    }
    console.error('[registro] signUp:', error.code, error.message)
    return { error: 'No se ha podido crear la cuenta. Inténtalo de nuevo.' }
  }

  await registrarConsentimiento({ subjectType: 'priest', subjectId: data.user?.id, email, kind: 'service', text: CONSENT_TEXT.priest })
  if (newsletter) {
    await suscribirNewsletter(email, fullName, 'priest')
    await registrarConsentimiento({ subjectType: 'newsletter', email, kind: 'newsletter', text: CONSENT_TEXT.newsletter })
  }

  after(() => notificarAltaSacerdote(fullName, email))

  // Si la confirmación por email está desactivada llega sesión directa
  if (data.session) redirect('/panel')

  return {
    ok: 'Te hemos enviado un email para confirmar la cuenta. Revisa tu bandeja de entrada.',
  }
}

export async function registroFiel(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const fullName = String(formData.get('full_name') ?? '').trim()
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')
  const consent = formData.get('consent') === 'on'
  const newsletter = formData.get('newsletter') === 'on'

  if (fullName.length < 2) return { error: 'Indica tu nombre.' }
  if (!email) return { error: 'Indica tu email.' }
  if (password.length < 8) return { error: 'La contraseña debe tener al menos 8 caracteres.' }
  if (!consent) return { error: 'Necesitamos tu consentimiento expreso para crear la cuenta.' }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // El trigger handle_new_user crea el perfil con rol fiel (sin ficha de sacerdote)
      data: { full_name: fullName, role: 'fiel', consent_at: new Date().toISOString() },
      emailRedirectTo: `${siteUrl()}/auth/callback?next=/mi-cuenta`,
    },
  })
  if (error) {
    if (error.message.toLowerCase().includes('already')) return { error: 'Ya existe una cuenta con ese email.' }
    console.error('[registro fiel] signUp:', error.code, error.message)
    return { error: 'No se ha podido crear la cuenta. Inténtalo de nuevo.' }
  }

  await registrarConsentimiento({ subjectType: 'faithful', subjectId: data.user?.id, email, kind: 'service', text: CONSENT_TEXT.faithful })
  if (newsletter) {
    await suscribirNewsletter(email, fullName, 'faithful')
    await registrarConsentimiento({ subjectType: 'newsletter', email, kind: 'newsletter', text: CONSENT_TEXT.newsletter })
  }

  if (data.session) redirect('/mi-cuenta')
  return { ok: 'Te hemos enviado un email para confirmar la cuenta. Revisa tu bandeja de entrada.' }
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/')
}

export async function recuperarContrasena(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim()
  if (!email) return { error: 'Indica tu email.' }

  const supabase = await createClient()
  // El enlace del correo pasa por /auth/callback (intercambia el código por sesión)
  // y aterriza en la página de cambio de contraseña.
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl()}/auth/callback?next=/cuenta/contrasena`,
  })
  if (error) console.error('[recuperar]', error.code, error.message)

  // Misma respuesta exista o no la cuenta, para no revelar qué emails están registrados
  return {
    ok: 'Si ese email tiene cuenta, recibirás en unos minutos un enlace para crear una contraseña nueva. Revisa también la carpeta de spam.',
  }
}

export async function cambiarContrasena(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const password = String(formData.get('password') ?? '')
  const repetir = String(formData.get('password2') ?? '')
  if (password.length < 8) return { error: 'La contraseña debe tener al menos 8 caracteres.' }
  if (password !== repetir) return { error: 'Las dos contraseñas no coinciden.' }

  const supabase = await createClient()
  const { error } = await supabase.auth.updateUser({ password })
  if (error) {
    console.error('[contrasena]', error.code, error.message)
    return {
      error:
        error.code === 'same_password'
          ? 'La contraseña nueva es igual que la anterior.'
          : 'No se ha podido cambiar la contraseña. Si llegaste desde un enlace de recuperación, puede haber caducado: pide otro.',
    }
  }
  return { ok: 'Contraseña cambiada.' }
}

export async function cambiarEmail(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get('email') ?? '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'El email no parece válido.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Sesión caducada.' }
  if (user.email?.toLowerCase() === email) return { error: 'Ese ya es tu email.' }

  // Supabase envía un enlace de confirmación al email nuevo (y, según la configuración,
  // también al antiguo). El cambio se aplica cuando se confirma; el trigger
  // on_auth_user_email_changed actualiza profiles.email.
  const { error } = await supabase.auth.updateUser(
    { email },
    { emailRedirectTo: `${siteUrl()}/auth/callback?next=/cuenta/email?ok=1` }
  )
  if (error) {
    console.error('[email]', error.code, error.message)
    return {
      error:
        error.code === 'email_exists'
          ? 'Ya hay una cuenta con ese email.'
          : 'No se ha podido iniciar el cambio. Inténtalo de nuevo.',
    }
  }
  return {
    ok: `Te hemos enviado un enlace a ${email}. El cambio se aplicará cuando lo confirmes; hasta entonces sigues entrando con el email actual.`,
  }
}
