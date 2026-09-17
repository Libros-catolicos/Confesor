'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/admin'

const ESTADOS = ['pendiente', 'verificado', 'rechazado', 'suspendido'] as const

export async function cambiarEstadoSacerdote(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  const status = String(formData.get('status') ?? '')
  if (!id || !ESTADOS.includes(status as (typeof ESTADOS)[number])) return

  const { supabase } = await requireAdmin()
  const { error } = await supabase.from('priests').update({ status }).eq('id', id)
  if (error) console.error('[admin] estado sacerdote:', error.message)

  // TODO: avisar al sacerdote por email del cambio de estado (pendiente de SMTP)
  revalidatePath('/admin')
}
