'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { bajaNewsletterPorEmail, registrarConsentimiento } from '@/lib/consentimiento'
import { CONSENT_TEXT } from '@/lib/legal'

export type CuentaState = { error?: string; ok?: string } | undefined

async function sesion() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/mi-cuenta')
  return { supabase, user }
}

/**
 * "Me he confesado el…". Guardamos solo la última fecha, no un historial: es un
 * dato sacramental y conviene conservar lo mínimo imprescindible para el aviso.
 */
export async function registrarConfesion(_prev: CuentaState, formData: FormData): Promise<CuentaState> {
  const fecha = String(formData.get('fecha') ?? '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { error: 'Indica la fecha.' }
  if (new Date(fecha) > new Date()) return { error: 'La fecha no puede ser futura.' }

  const { supabase, user } = await sesion()
  const { error } = await supabase.from('profiles').update({ last_confession_on: fecha }).eq('id', user.id)
  if (error) {
    console.error('[mi-cuenta] confesión:', error.message)
    return { error: 'No se ha podido guardar.' }
  }
  revalidatePath('/mi-cuenta')
  return { ok: 'Anotado.' }
}

/** Borra la única fecha guardada */
export async function borrarConfesion() {
  const { supabase, user } = await sesion()
  await supabase.from('profiles').update({ last_confession_on: null }).eq('id', user.id)
  revalidatePath('/mi-cuenta')
}

export async function guardarAvisos(_prev: CuentaState, formData: FormData): Promise<CuentaState> {
  const notify = formData.get('notify_appointments') === 'on'
  const reminder = Number(formData.get('reminder_days') ?? 0)
  if (![0, 30, 60, 90, 180].includes(reminder)) return { error: 'Valor no válido.' }

  const { supabase, user } = await sesion()
  const { error } = await supabase
    .from('profiles')
    .update({ notify_appointments: notify, reminder_days: reminder })
    .eq('id', user.id)
  if (error) return { error: 'No se han podido guardar los avisos.' }
  revalidatePath('/mi-cuenta')
  return { ok: 'Avisos guardados.' }
}

export async function borrarCuenta(formData: FormData) {
  if (String(formData.get('confirmar') ?? '') !== 'BORRAR') return
  const { supabase, user } = await sesion()
  const bajaLista = formData.get('baja_lista') === 'on'

  // Prueba de la retirada del consentimiento (se conserva bloqueada 3 años)
  if (user.email) {
    await registrarConsentimiento({ subjectType: 'faithful', subjectId: user.id, email: user.email, kind: 'service', text: CONSENT_TEXT.faithful, action: 'withdrawn' })
    if (bajaLista) await bajaNewsletterPorEmail(user.email)
  }

  const { error } = await supabase.rpc('delete_my_account')
  if (error) {
    console.error('[mi-cuenta] borrar:', error.message)
    return
  }
  await supabase.auth.signOut()
  redirect('/?cuenta=borrada')
}
