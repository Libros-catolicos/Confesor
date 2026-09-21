'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type CuentaState = { error?: string; ok?: string } | undefined

async function sesion() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/mi-cuenta')
  return { supabase, user }
}

/** "Me he confesado" con una fecha (hoy por defecto) */
export async function registrarConfesion(_prev: CuentaState, formData: FormData): Promise<CuentaState> {
  const fecha = String(formData.get('fecha') ?? '')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return { error: 'Indica la fecha.' }
  if (new Date(fecha) > new Date()) return { error: 'La fecha no puede ser futura.' }

  const { supabase, user } = await sesion()
  const { error } = await supabase.from('confessions').insert({ user_id: user.id, confessed_on: fecha })
  if (error && error.code !== '23505') {
    console.error('[mi-cuenta] confesión:', error.message)
    return { error: 'No se ha podido guardar.' }
  }
  revalidatePath('/mi-cuenta')
  return { ok: 'Anotado.' }
}

export async function borrarConfesion(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  if (!id) return
  const { supabase } = await sesion()
  await supabase.from('confessions').delete().eq('id', id)
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
  const { supabase } = await sesion()
  const { error } = await supabase.rpc('delete_my_account')
  if (error) {
    console.error('[mi-cuenta] borrar:', error.message)
    return
  }
  await supabase.auth.signOut()
  redirect('/?cuenta=borrada')
}
