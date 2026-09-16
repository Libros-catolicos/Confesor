'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type HorarioState = { error?: string; ok?: string } | undefined

const HORA_RE = /^([01]\d|2[0-3]):[0-5]\d$/

export async function crearRegla(_prev: HorarioState, formData: FormData): Promise<HorarioState> {
  const placeId = String(formData.get('place_id') ?? '')
  const weekdays = formData
    .getAll('weekday')
    .map(Number)
    .filter((d) => d >= 1 && d <= 7)
  const start = String(formData.get('start_time') ?? '')
  const end = String(formData.get('end_time') ?? '')
  const slot = Number(formData.get('slot_minutes') ?? 20)
  const type = String(formData.get('type') ?? 'confesion')

  if (!placeId) return { error: 'Elige un lugar.' }
  if (weekdays.length === 0) return { error: 'Marca al menos un día de la semana.' }
  if (!HORA_RE.test(start) || !HORA_RE.test(end)) return { error: 'Horas no válidas.' }
  if (end <= start) return { error: 'La hora de fin debe ser posterior a la de inicio.' }
  if (![10, 15, 20, 30, 45, 60].includes(slot)) return { error: 'Duración no válida.' }
  if (!['confesion', 'conversacion'].includes(type)) return { error: 'Tipo no válido.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Sesión caducada.' }

  const { error } = await supabase.from('availability_rules').insert(
    weekdays.map((weekday) => ({
      priest_id: user.id,
      place_id: placeId,
      weekday,
      start_time: start,
      end_time: end,
      slot_minutes: slot,
      type,
    }))
  )
  if (error) {
    console.error('[horarios] insert:', error.message)
    return { error: 'No se ha podido guardar el horario.' }
  }

  revalidatePath('/panel')
  return { ok: 'Horario añadido.' }
}

export async function borrarRegla(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  if (!id) return
  const supabase = await createClient()
  await supabase.from('availability_rules').delete().eq('id', id)
  revalidatePath('/panel')
}

export async function alternarRegla(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  const active = formData.get('active') === 'true'
  if (!id) return
  const supabase = await createClient()
  await supabase.from('availability_rules').update({ active }).eq('id', id)
  revalidatePath('/panel')
}

export async function crearAusencia(_prev: HorarioState, formData: FormData): Promise<HorarioState> {
  const date = String(formData.get('date') ?? '')
  const start = String(formData.get('start_time') ?? '')
  const end = String(formData.get('end_time') ?? '')
  const note = String(formData.get('note') ?? '').trim()

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: 'Indica la fecha.' }
  const tramo = Boolean(start || end)
  if (tramo && (!HORA_RE.test(start) || !HORA_RE.test(end) || end <= start)) {
    return { error: 'Si indicas un tramo, pon hora de inicio y fin válidas.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { error: 'Sesión caducada.' }

  const { error } = await supabase.from('absences').insert({
    priest_id: user.id,
    date,
    start_time: tramo ? start : null,
    end_time: tramo ? end : null,
    note: note || null,
  })
  if (error) {
    console.error('[ausencias] insert:', error.message)
    return { error: 'No se ha podido guardar la ausencia.' }
  }

  revalidatePath('/panel')
  return { ok: 'Ausencia guardada.' }
}

export async function borrarAusencia(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  if (!id) return
  const supabase = await createClient()
  await supabase.from('absences').delete().eq('id', id)
  revalidatePath('/panel')
}
