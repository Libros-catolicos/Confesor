// Notificaciones por email de las citas. Cada función lee los datos de la cita
// con un token (del fiel o del sacerdote) y envía lo que corresponda.
// Se llaman desde server actions con after(), para no retrasar la respuesta.

import { createClient } from '@supabase/supabase-js'
import { enviarEmail, plantilla } from '@/lib/email'
import { fmtFechaHora } from '@/lib/fechas'
import { nombreIdioma } from '@/lib/idiomas'
import { siteUrl } from '@/lib/site'
import { SLOT_TYPE_LABEL, type AppointmentStatus, type SlotType } from '@/lib/types'

interface Datos {
  id: string
  status: AppointmentStatus
  type: SlotType
  language: string
  starts_at: string
  ends_at: string
  proposed_starts_at: string | null
  cancel_message: string | null
  cancelled_by: 'sacerdote' | 'fiel' | null
  guest_name: string
  guest_email: string | null
  guest_phone: string | null
  manage_token: string
  priest_token: string
  priest_name: string
  priest_email: string
  priest_slug: string
  auto_confirm: boolean
  place_name: string
  address: string
  city: string | null
  timezone: string
}

// Cliente sin sesión: la RPC es security definer y se llama con un token secreto.
// Así funciona también dentro de after(), fuera del contexto de la petición.
function clienteAnonimo() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function cargar(token: string): Promise<Datos | null> {
  const supabase = clienteAnonimo()
  const { data, error } = await supabase.rpc('get_appointment_notification', { p_token: token })
  if (error) console.error('[notificaciones] cargar:', error.message)
  return (data as Datos[] | null)?.[0] ?? null
}

const cuando = (d: Datos, iso = d.starts_at) => fmtFechaHora(iso, d.timezone)
const lugar = (d: Datos) => `${d.place_name}, ${d.address}${d.city ? `, ${d.city}` : ''}`
const resumenHtml = (d: Datos, iso = d.starts_at) =>
  `<p><strong>${SLOT_TYPE_LABEL[d.type]}</strong> · ${cuando(d, iso)}<br>${lugar(d)}<br>Idioma: ${nombreIdioma(d.language)}</p>`
const resumenTexto = (d: Datos, iso = d.starts_at) =>
  `${SLOT_TYPE_LABEL[d.type]} · ${cuando(d, iso)}\n${lugar(d)}\nIdioma: ${nombreIdioma(d.language)}`
const contacto = (d: Datos) => [d.guest_email, d.guest_phone].filter(Boolean).join(' · ')

/** Tras reservar: aviso al sacerdote (con Confirmar/Rechazar) y confirmación al fiel */
export async function notificarNuevaCita(manageToken: string) {
  const d = await cargar(manageToken)
  if (!d) return
  const base = siteUrl()
  const urlSacerdote = `${base}/cita/sacerdote/${d.priest_token}`
  const urlFiel = `${base}/cita/${d.manage_token}`
  const pendiente = d.status === 'pendiente'

  await enviarEmail({
    to: d.priest_email,
    replyTo: d.guest_email ?? undefined,
    subject: pendiente
      ? `Nueva solicitud de cita: ${d.guest_name}, ${cuando(d)}`
      : `Nueva cita reservada: ${d.guest_name}, ${cuando(d)}`,
    html: plantilla(
      pendiente ? 'Nueva solicitud de cita' : 'Nueva cita reservada',
      `<p><strong>${d.guest_name}</strong> ha ${pendiente ? 'solicitado' : 'reservado'} una cita contigo.</p>
       ${resumenHtml(d)}
       <p>Contacto: ${contacto(d) || 'no indicado'}</p>
       ${pendiente ? '<p>La cita queda <strong>pendiente</strong> hasta que la confirmes.</p>' : '<p>La cita está <strong>confirmada</strong>. Si no puedes atenderla, cancélala o propón otra hora.</p>'}`,
      pendiente
        ? { texto: 'Confirmar', url: `${urlSacerdote}?accion=confirmar`, secundario: { texto: 'Rechazar', url: `${urlSacerdote}?accion=rechazar` } }
        : { texto: 'Ver la cita', url: urlSacerdote }
    ),
    text: `${d.guest_name} ha ${pendiente ? 'solicitado' : 'reservado'} una cita contigo.\n\n${resumenTexto(d)}\nContacto: ${contacto(d) || 'no indicado'}\n\n${
      pendiente ? `Confirmar o rechazar: ${urlSacerdote}` : `Ver la cita: ${urlSacerdote}`
    }`,
  })

  if (d.guest_email) {
    await enviarEmail({
      to: d.guest_email,
      subject: pendiente ? `Solicitud enviada a ${d.priest_name}` : `Cita confirmada con ${d.priest_name}`,
      html: plantilla(
        pendiente ? 'Solicitud enviada' : 'Cita reservada',
        `<p>Hola, ${d.guest_name}.</p>
         <p>${pendiente ? `Tu solicitud ha llegado a <strong>${d.priest_name}</strong>. Te avisaremos cuando la confirme.` : `Tu cita con <strong>${d.priest_name}</strong> está confirmada.`}</p>
         ${resumenHtml(d)}
         <p>Desde el enlace puedes consultar la cita, añadirla a tu calendario o cancelarla si no puedes acudir.</p>`,
        { texto: 'Ver mi cita', url: urlFiel }
      ),
      text: `Hola, ${d.guest_name}.\n\n${pendiente ? `Tu solicitud ha llegado a ${d.priest_name}. Te avisaremos cuando la confirme.` : `Tu cita con ${d.priest_name} está confirmada.`}\n\n${resumenTexto(d)}\n\nGestiona tu cita: ${urlFiel}`,
    })
  }
}

/** El sacerdote ha confirmado, cancelado o propuesto otra hora → aviso al fiel */
export async function notificarRespuestaSacerdote(token: string) {
  const d = await cargar(token)
  if (!d?.guest_email) return
  const urlFiel = `${siteUrl()}/cita/${d.manage_token}`
  let titulo: string, cuerpo: string, texto: string

  if (d.status === 'confirmada') {
    titulo = `Cita confirmada con ${d.priest_name}`
    cuerpo = `<p>Hola, ${d.guest_name}. <strong>${d.priest_name}</strong> ha confirmado tu cita.</p>${resumenHtml(d)}`
    texto = `${d.priest_name} ha confirmado tu cita.\n\n${resumenTexto(d)}`
  } else if (d.status === 'reprogramar' && d.proposed_starts_at) {
    titulo = `${d.priest_name} propone otra hora`
    cuerpo = `<p>Hola, ${d.guest_name}. <strong>${d.priest_name}</strong> no puede atenderte a la hora reservada (${cuando(d)}) y te propone:</p>
      ${resumenHtml(d, d.proposed_starts_at)}
      ${d.cancel_message ? `<p><em>«${d.cancel_message}»</em></p>` : ''}
      <p>Puedes aceptar la nueva hora o rechazarla desde tu enlace.</p>`
    texto = `${d.priest_name} no puede atenderte a la hora reservada y te propone: ${cuando(d, d.proposed_starts_at)}.${d.cancel_message ? `\nMensaje: ${d.cancel_message}` : ''}\n\nAcepta o rechaza la propuesta: ${urlFiel}`
  } else if (d.status === 'cancelada') {
    titulo = `Cita cancelada por ${d.priest_name}`
    cuerpo = `<p>Hola, ${d.guest_name}. Lo sentimos: <strong>${d.priest_name}</strong> ha tenido que cancelar la cita del ${cuando(d)}.</p>
      ${d.cancel_message ? `<p><em>«${d.cancel_message}»</em></p>` : ''}
      <p>Puedes reservar otra hora desde su ficha.</p>`
    texto = `${d.priest_name} ha tenido que cancelar la cita del ${cuando(d)}.${d.cancel_message ? `\nMensaje: ${d.cancel_message}` : ''}\n\nReservar otra: ${siteUrl()}/s/${d.priest_slug}`
  } else {
    return
  }

  await enviarEmail({
    to: d.guest_email,
    subject: titulo,
    html: plantilla(titulo, cuerpo, {
      texto: d.status === 'cancelada' ? 'Reservar otra hora' : 'Ver mi cita',
      url: d.status === 'cancelada' ? `${siteUrl()}/s/${d.priest_slug}` : urlFiel,
    }),
    text: texto,
  })
}

/** El fiel ha cancelado o ha aceptado la nueva hora → aviso al sacerdote */
export async function notificarRespuestaFiel(manageToken: string) {
  const d = await cargar(manageToken)
  if (!d) return
  const urlSacerdote = `${siteUrl()}/cita/sacerdote/${d.priest_token}`

  if (d.status === 'cancelada' && d.cancelled_by === 'fiel') {
    await enviarEmail({
      to: d.priest_email,
      subject: `Cita cancelada: ${d.guest_name}, ${cuando(d)}`,
      html: plantilla('Cita cancelada', `<p><strong>${d.guest_name}</strong> ha cancelado su cita.</p>${resumenHtml(d)}<p>El hueco vuelve a estar libre.</p>`),
      text: `${d.guest_name} ha cancelado su cita.\n\n${resumenTexto(d)}\n\nEl hueco vuelve a estar libre.`,
    })
  } else if (d.status === 'confirmada') {
    await enviarEmail({
      to: d.priest_email,
      subject: `${d.guest_name} ha aceptado la nueva hora: ${cuando(d)}`,
      html: plantilla('Nueva hora aceptada', `<p><strong>${d.guest_name}</strong> ha aceptado la hora que propusiste.</p>${resumenHtml(d)}<p>Contacto: ${contacto(d) || 'no indicado'}</p>`, { texto: 'Ver la cita', url: urlSacerdote }),
      text: `${d.guest_name} ha aceptado la hora que propusiste.\n\n${resumenTexto(d)}\nContacto: ${contacto(d) || 'no indicado'}\n\n${urlSacerdote}`,
    })
  }
}
