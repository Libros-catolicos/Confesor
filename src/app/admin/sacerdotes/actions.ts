'use server'

import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { requireAdmin } from '@/lib/admin'
import { enviarEmail, plantilla } from '@/lib/email'
import { siteUrl } from '@/lib/site'

const ESTADOS = ['pendiente', 'verificado', 'rechazado', 'suspendido'] as const

export async function cambiarEstadoSacerdote(formData: FormData) {
  const id = String(formData.get('id') ?? '')
  const status = String(formData.get('status') ?? '')
  if (!id || !ESTADOS.includes(status as (typeof ESTADOS)[number])) return

  const motivo = String(formData.get('motivo') ?? '').trim()
  const { supabase } = await requireAdmin()
  const { error } = await supabase.from('priests').update({ status }).eq('id', id)
  if (error) console.error('[admin] estado sacerdote:', error.message)

  const { data: perfil } = await supabase.from('profiles').select('email, full_name').eq('id', id).maybeSingle()
  if (perfil?.email && status !== 'pendiente') {
    const base = siteUrl()
    const correos = {
      verificado: {
        subject: 'Tu ficha en Confesor ya es pública',
        titulo: 'Ficha verificada',
        cuerpo: `<p>Hola, ${perfil.full_name}. Hemos verificado tu condición de sacerdote y tu ficha ya es pública. Los fieles pueden encontrarte y reservar contigo.</p><p>Revisa que tus lugares y horarios estén al día desde tu panel.</p>`,
        boton: { texto: 'Ir a mi panel', url: `${base}/panel` },
      },
      rechazado: {
        subject: 'Sobre tu solicitud en Confesor',
        titulo: 'No hemos podido verificar tu ficha',
        cuerpo: `<p>Hola, ${perfil.full_name}. No hemos podido verificar tu condición de sacerdote con los datos facilitados.${motivo ? ` Motivo: ${motivo}.` : ''}</p><p>Si crees que es un error o puedes aportar más información (correo institucional, parroquia, contacto en tu diócesis), responde a este correo o escribe a info@confesor.es.</p>`,
        boton: { texto: 'Completar mis datos', url: `${base}/panel/ficha` },
      },
      suspendido: {
        subject: 'Tu ficha en Confesor ha sido suspendida',
        titulo: 'Ficha suspendida',
        cuerpo: `<p>Hola, ${perfil.full_name}. Hemos suspendido tu ficha, que ha dejado de ser pública.${motivo ? ` Motivo: ${motivo}.` : ''}</p><p>Puedes responder a este correo o escribir a info@confesor.es para aclararlo.</p>`,
        boton: undefined,
      },
    }[status as 'verificado' | 'rechazado' | 'suspendido']
    const destinatario = perfil.email
    after(() =>
      enviarEmail({
        to: destinatario,
        subject: correos.subject,
        html: plantilla(correos.titulo, correos.cuerpo, correos.boton),
        text: correos.cuerpo.replace(/<[^>]+>/g, ''),
      })
    )
  }

  revalidatePath('/admin')
}
