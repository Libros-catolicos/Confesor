'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function cancelarCita(formData: FormData) {
  const token = String(formData.get('token') ?? '')
  if (!token) return

  const supabase = await createClient()
  await supabase.rpc('cancel_appointment', { p_token: token })
  revalidatePath(`/cita/${token}`)
}
