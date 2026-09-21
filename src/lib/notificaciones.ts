// Notificaciones por email de las citas. Cada función carga la cita por su token
// (del fiel o del sacerdote) con la clave de servicio: el email del fiel no es
// legible por ningún cliente, solo por el servidor en el momento de enviar.
// Se llaman desde server actions con after(), para no retrasar la respuesta.
//
// Regla del documento legal: el sacerdote nunca recibe el contacto del fiel;
// los asuntos son neutros (nunca la palabra "confesión").

import { createAdminClient } from '@/lib/supabase/admin'
import { bloqueComercial, enviarEmail, plantilla } from '@/lib/email'
import { estaSuscrito, tokenDeBaja } from '@/lib/consentimiento'
import { fmtFechaHora, fmtHora } from '@/lib/fechas'
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
  manage_token: string
  priest_token: string
  arrived_at: string | null
  priests: { display_name: string; slug: string } | null
  places: { name: string; address: string; city: string | null; timezone: string } | null
}

async function cargar(token: string): Promise<(Datos & { priest_email: string | null }) | null> {
  try {
    const db = createAdminClient()
    const { data, error } = await db
      .from('appointments')
      .select(
        'id, status, type, language, starts_at, ends_at, proposed_starts_at, cancel_message, cancelled_by, guest_name, guest_email, manage_token, priest_token, arrived_at, priest_id, priests(display_name, slug), places(name, address, city, timezone)'
      )
      .or(`manage_token.eq.${token},priest_token.eq.${token}`)
      .maybeSingle<Datos & { priest_id: string }>()
    if (error || !data) {
      if (error) console.error('[notificaciones] cargar:', error.message)
      return null
    }
    const { data: perfil } = await db.from('profiles').select('email').eq('id', data.priest_id).maybeSingle()
    return { ...data, priest_email: perfil?.email ?? null }
  } catch (e) {
    console.error('[notificaciones]', e)
    return null
  }
}

const tz = (d: Datos) => d.places?.timezone ?? 'Europe/Madrid'
const cuando = (d: Datos, iso = d.starts_at) => fmtFechaHora(iso, tz(d))
const lugar = (d: Datos) => `${d.places?.name}, ${d.places?.address}${d.places?.city ? `, ${d.places.city}` : ''}`
const nombreSacerdote = (d: Datos) => d.priests?.display_name ?? 'el sacerdote'
const resumenHtml = (d: Datos, iso = d.starts_at) =>
  `<p><strong>${SLOT_TYPE_LABEL[d.type]}</strong> · ${cuando(d, iso)}<br>${lugar(d)}<br>Idioma: ${nombreIdioma(d.language)}</p>`
const resumenTexto = (d: Datos, iso = d.starts_at) =>
  `${SLOT_TYPE_LABEL[d.type]} · ${cuando(d, iso)}\n${lugar(d)}\nIdioma: ${nombreIdioma(d.language)}`

/** Tras reservar: aviso al sacerdote (solo nombre; Confirmar/Rechazar) y confirmación al fiel */
export async function notificarNuevaCita(manageToken: string) {
  const d = await cargar(manageToken)
  if (!d) return
  const base = siteUrl()
  const urlSacerdote = `${base}/cita/sacerdote/${d.priest_token}`
  const urlFiel = `${base}/cita/${d.manage_token}`
  const pendiente = d.status === 'pendiente'

  if (d.priest_email) {
    await enviarEmail({
      to: d.priest_email,
      subject: pendiente
        ? `Nueva solicitud de cita: ${d.guest_name}, ${cuando(d)}`
        : `Nueva cita reservada: ${d.guest_name}, ${cuando(d)}`,
      html: plantilla(
        pendiente ? 'Nueva solicitud de cita' : 'Nueva cita reservada',
        `<p><strong>${d.guest_name}</strong> ha ${pendiente ? 'solicitado' : 'reservado'} una cita contigo.</p>
         ${resumenHtml(d)}
         ${pendiente ? '<p>La cita queda <strong>pendiente</strong> hasta que la confirmes.</p>' : '<p>La cita está <strong>confirmada</strong>. Si no puedes atenderla, cancélala o propón otra hora desde tu panel.</p>'}
         <p style="font-size:12px;color:#6b625c">Por privacidad no te mostramos los datos de contacto del fiel: Confesor le avisa de todo lo que hagas con la cita.</p>`,
        pendiente
          ? { texto: 'Confirmar', url: `${urlSacerdote}?accion=confirmar`, secundario: { texto: 'Rechazar', url: `${urlSacerdote}?accion=rechazar` } }
          : { texto: 'Ver la cita', url: urlSacerdote }
      ),
      text: `${d.guest_name} ha ${pendiente ? 'solicitado' : 'reservado'} una cita contigo.\n\n${resumenTexto(d)}\n\n${
        pendiente ? `Confirmar o rechazar: ${urlSacerdote}` : `Ver la cita: ${urlSacerdote}`
      }`,
    })
  }

  if (d.guest_email) {
    // Bloque comercial solo si el destinatario está suscrito (decisión en servidor, al enviar)
    const comercial = (await estaSuscrito(d.guest_email)) ? bloqueComercial(await tokenDeBaja(d.guest_email)) : null
    await enviarEmail({
      to: d.guest_email,
      subject: pendiente ? `Solicitud enviada a ${nombreSacerdote(d)}` : `Cita confirmada con ${nombreSacerdote(d)}`,
      html: plantilla(
        pendiente ? 'Solicitud enviada' : 'Cita reservada',
        `<p>Hola, ${d.guest_name}.</p>
         <p>${pendiente ? `Tu solicitud ha llegado a <strong>${nombreSacerdote(d)}</strong>. Te avisaremos cuando la confirme.` : `Tu cita con <strong>${nombreSacerdote(d)}</strong> está confirmada.`}</p>
         ${resumenHtml(d)}
         <p>Desde el enlace puedes consultar la cita, añadirla a tu calendario, avisar de que has llegado o cancelarla si no puedes acudir.</p>`,
        { texto: 'Ver mi cita', url: urlFiel },
        comercial?.html ?? ''
      ),
      text: `Hola, ${d.guest_name}.\n\n${pendiente ? `Tu solicitud ha llegado a ${nombreSacerdote(d)}. Te avisaremos cuando la confirme.` : `Tu cita con ${nombreSacerdote(d)} está confirmada.`}\n\n${resumenTexto(d)}\n\nGestiona tu cita: ${urlFiel}${comercial?.text ?? ''}`,
    })
  }
}

/** El sacerdote ha confirmado, cancelado o propuesto otra hora → aviso al fiel */
export async function notificarRespuestaSacerdote(token: string) {
  const d = await cargar(token)
  if (!d?.guest_email) return
  const urlFiel = `${siteUrl()}/cita/${d.manage_token}`
  const sacerdote = nombreSacerdote(d)
  const urlFicha = `${siteUrl()}/s/${d.priests?.slug ?? ''}`
  let titulo: string, cuerpo: string, texto: string

  if (d.status === 'confirmada') {
    titulo = `Cita confirmada con ${sacerdote}`
    cuerpo = `<p>Hola, ${d.guest_name}. <strong>${sacerdote}</strong> ha confirmado tu cita.</p>${resumenHtml(d)}`
    texto = `${sacerdote} ha confirmado tu cita.\n\n${resumenTexto(d)}`
  } else if (d.status === 'reprogramar' && d.proposed_starts_at) {
    titulo = `${sacerdote} propone otra hora`
    cuerpo = `<p>Hola, ${d.guest_name}. <strong>${sacerdote}</strong> no puede atenderte a la hora reservada (${cuando(d)}) y te propone:</p>
      ${resumenHtml(d, d.proposed_starts_at)}
      ${d.cancel_message ? `<p><em>«${d.cancel_message}»</em></p>` : ''}
      <p>Puedes aceptar la nueva hora o, si no te va bien, rechazarla y reservar otra desde su ficha.</p>`
    texto = `${sacerdote} no puede atenderte a la hora reservada y te propone: ${cuando(d, d.proposed_starts_at)}.${d.cancel_message ? `\nMensaje: ${d.cancel_message}` : ''}\n\nAcepta o rechaza la propuesta: ${urlFiel}`
  } else if (d.status === 'cancelada') {
    titulo = `Cita cancelada por ${sacerdote}`
    cuerpo = `<p>Hola, ${d.guest_name}. Lo sentimos: <strong>${sacerdote}</strong> ha tenido que cancelar la cita del ${cuando(d)}.</p>
      ${d.cancel_message ? `<p><em>«${d.cancel_message}»</em></p>` : ''}
      <p>Puedes reservar otra hora desde su ficha.</p>`
    texto = `${sacerdote} ha tenido que cancelar la cita del ${cuando(d)}.${d.cancel_message ? `\nMensaje: ${d.cancel_message}` : ''}\n\nReservar otra: ${urlFicha}`
  } else {
    return
  }

  await enviarEmail({
    to: d.guest_email,
    subject: titulo,
    html: plantilla(titulo, cuerpo, {
      texto: d.status === 'cancelada' ? 'Reservar otra hora' : 'Ver mi cita',
      url: d.status === 'cancelada' ? urlFicha : urlFiel,
    }),
    text: texto,
  })
}

/** El fiel ha cancelado o ha aceptado la nueva hora → aviso al sacerdote (solo nombre) */
export async function notificarRespuestaFiel(manageToken: string) {
  const d = await cargar(manageToken)
  if (!d?.priest_email) return
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
      html: plantilla('Nueva hora aceptada', `<p><strong>${d.guest_name}</strong> ha aceptado la hora que propusiste.</p>${resumenHtml(d)}`, { texto: 'Ver la cita', url: urlSacerdote }),
      text: `${d.guest_name} ha aceptado la hora que propusiste.\n\n${resumenTexto(d)}\n\n${urlSacerdote}`,
    })
  }
}

/** El fiel ha pulsado "Ya estoy aquí" → aviso inmediato al sacerdote */
export async function notificarLlegada(manageToken: string) {
  const d = await cargar(manageToken)
  if (!d?.priest_email) return
  const hora = d.arrived_at ? fmtHora(d.arrived_at, tz(d)) : ''
  await enviarEmail({
    to: d.priest_email,
    subject: `${d.guest_name} ya está en ${d.places?.name ?? 'la parroquia'}`,
    html: plantilla(
      `${d.guest_name} ha llegado`,
      `<p><strong>${d.guest_name}</strong> avisa de que ya está en ${d.places?.name ?? 'el lugar de la cita'}${hora ? ` (${hora})` : ''}.</p>${resumenHtml(d)}`
    ),
    text: `${d.guest_name} avisa de que ya está en ${d.places?.name ?? 'el lugar de la cita'}${hora ? ` (${hora})` : ''}.\n\n${resumenTexto(d)}`,
  })
}
