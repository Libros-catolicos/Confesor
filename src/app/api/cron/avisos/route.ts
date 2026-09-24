import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { enviarEmail, plantilla } from '@/lib/email'
import { fmtFechaHora } from '@/lib/fechas'
import { siteUrl } from '@/lib/site'
import { SLOT_TYPE_LABEL, type SlotType } from '@/lib/types'

// Ejecutado a diario por Vercel Cron (vercel.json). Necesita:
//   CRON_SECRET          lo pone Vercel automáticamente y lo manda en Authorization
//   SUPABASE_SECRET_KEY  clave de servicio (Supabase → Settings → API keys), para leer todas las citas
export const maxDuration = 60

interface CitaManana {
  id: string
  starts_at: string
  type: SlotType
  guest_name: string
  guest_email: string
  manage_token: string
  user_id: string | null
  reminder_opt_in: boolean
  priests: { display_name: string } | null
  places: { name: string; address: string; city: string | null; timezone: string } | null
}

interface SacerdoteHorarios {
  id: string
  display_name: string
  slug: string
  schedules_confirmed_at: string | null
  schedules_reminded_at: string | null
  created_at: string
  profiles: { email: string } | null
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const secret = process.env.SUPABASE_SECRET_KEY
  if (!secret) return NextResponse.json({ error: 'Falta SUPABASE_SECRET_KEY' }, { status: 500 })

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, secret, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const base = siteUrl()
  const resultado = { borradas: 0, recordatorios: 0, avisos: 0, horarios: 0 }

  // ---------- 0. Borrado de reservas 7 días después de la cita (política §2) ----------
  const { data: purga, error: errPurga } = await db.rpc('purge_appointments')
  if (errPurga) console.error('[cron] purge_appointments:', errPurga.message)
  const p = (Array.isArray(purga) ? purga[0] : purga) as { deleted: number } | undefined
  resultado.borradas = p?.deleted ?? 0

  // ---------- 1. Recordatorio de cita: citas que empiezan entre 20 y 44 horas después ----------
  const desde = new Date(Date.now() + 20 * 3600e3).toISOString()
  const hasta = new Date(Date.now() + 44 * 3600e3).toISOString()
  const { data: citas } = await db
    .from('appointments')
    .select('id, starts_at, type, guest_name, guest_email, manage_token, user_id, reminder_opt_in, priests(display_name), places(name, address, city, timezone)')
    .in('status', ['pendiente', 'confirmada'])
    .gte('starts_at', desde)
    .lte('starts_at', hasta)
    .is('reminder_sent_at', null)
    .not('guest_email', 'is', null)
    .returns<CitaManana[]>()

  for (const c of citas ?? []) {
    // Solo con consentimiento: casilla marcada al reservar, o interruptor de la cuenta.
    // Ambos están apagados por defecto.
    let quiere = c.reminder_opt_in
    if (!quiere && c.user_id) {
      const { data: p } = await db.from('profiles').select('notify_appointments').eq('id', c.user_id).maybeSingle()
      quiere = Boolean(p?.notify_appointments)
    }
    if (!quiere) {
      await db.from('appointments').update({ reminder_sent_at: new Date().toISOString() }).eq('id', c.id)
      continue
    }
    const tz = c.places?.timezone ?? 'Europe/Madrid'
    const cuando = fmtFechaHora(c.starts_at, tz)
    const lugar = `${c.places?.name}, ${c.places?.address}${c.places?.city ? `, ${c.places.city}` : ''}`
    const ok = await enviarEmail({
      to: c.guest_email,
      subject: `Tu cita de mañana, ${cuando}`,
      html: plantilla(
        'Recordatorio de tu cita',
        `<p>Hola, ${c.guest_name}. Te recordamos tu cita de mañana:</p>
         <p><strong>${SLOT_TYPE_LABEL[c.type]}</strong> con ${c.priests?.display_name}<br>${cuando}<br>${lugar}</p>
         <p>Si no vas a poder acudir, cancélala desde tu enlace para liberar el hueco.</p>
         <p style="font-size:12px;color:#6b625c">Recibes este recordatorio porque lo pediste. Puedes desactivarlo desde el enlace de tu cita.</p>`,
        { texto: 'Ver mi cita', url: `${base}/cita/${c.manage_token}` }
      ),
      text: `Te recordamos tu cita de mañana: ${SLOT_TYPE_LABEL[c.type]} con ${c.priests?.display_name}, ${cuando}, ${lugar}.\n\nGestiona tu cita: ${base}/cita/${c.manage_token}`,
    })
    await db.from('appointments').update({ reminder_sent_at: new Date().toISOString() }).eq('id', c.id)
    if (ok) resultado.recordatorios++
  }

  // ---------- 2. Aviso por tiempo sin confesarse (solo fieles que lo han activado) ----------
  const { data: fieles } = await db
    .from('profiles')
    .select('id, full_name, email, reminder_days, last_nudge_at, last_confession_on')
    .eq('role', 'fiel')
    .gt('reminder_days', 0)

  for (const f of fieles ?? []) {
    const limite = new Date(Date.now() - f.reminder_days * 86400e3)
    // No repetir el aviso hasta que pase otro periodo completo
    if (f.last_nudge_at && new Date(f.last_nudge_at) > limite) continue

    // Solo conservamos una fecha: la última confesión anotada o deducida de una cita
    const { data: citas } = await db
      .from('appointments')
      .select('ends_at')
      .eq('user_id', f.id)
      .eq('type', 'confesion')
      .in('status', ['confirmada', 'completada'])
      .lt('ends_at', new Date().toISOString())
      .order('ends_at', { ascending: false })
      .limit(1)
    const fechas = [f.last_confession_on, citas?.[0]?.ends_at].filter(Boolean).map((d) => new Date(d as string))
    const ultima = fechas.length ? new Date(Math.max(...fechas.map((d) => d.getTime()))) : null
    if (ultima && ultima > limite) continue

    const dias = ultima ? Math.floor((Date.now() - ultima.getTime()) / 86400e3) : null
    const ok = await enviarEmail({
      to: f.email,
      subject: 'Un recordatorio de Confesor',
      html: plantilla(
        dias ? `Hace ${dias} días de tu última confesión` : 'Un momento para la confesión',
        `<p>Hola, ${f.full_name}. Nos pediste que te avisáramos cuando llevaras un tiempo sin confesarte.</p>
         <p>Si quieres, busca un sacerdote cerca de ti y reserva en un minuto. Y si ya te has confesado, anótalo en tu cuenta para que el cálculo esté al día.</p>
         <p style="font-size:12px;color:#6b625c">Puedes desactivar este aviso cuando quieras desde <a href="${base}/mi-cuenta">Mi cuenta</a>.</p>`,
        { texto: 'Buscar sacerdote', url: `${base}/buscar`, secundario: { texto: 'Mi cuenta', url: `${base}/mi-cuenta` } }
      ),
      text: `Hola, ${f.full_name}. Nos pediste que te avisáramos cuando llevaras un tiempo sin confesarte.${dias ? ` Han pasado ${dias} días.` : ''}\n\nBuscar sacerdote: ${base}/buscar\nMi cuenta: ${base}/mi-cuenta`,
    })
    await db.from('profiles').update({ last_nudge_at: new Date().toISOString() }).eq('id', f.id)
    if (ok) resultado.avisos++
  }

  // ---------- 3. Repaso semestral de horarios (nunca se pregunta por las facultades) ----------
  const semestre = new Date(Date.now() - 182 * 86400e3).toISOString()
  const { data: sacerdotes } = await db
    .from('priests')
    .select('id, display_name, slug, schedules_confirmed_at, schedules_reminded_at, created_at, profiles(email)')
    .eq('status', 'verificado')
    .eq('paused', false)
    .returns<SacerdoteHorarios[]>()

  for (const p of sacerdotes ?? []) {
    const ultimoRepaso = p.schedules_confirmed_at ?? p.created_at
    if (ultimoRepaso > semestre) continue
    // Un solo recordatorio por periodo
    if (p.schedules_reminded_at && p.schedules_reminded_at > semestre) continue
    const email = p.profiles?.email
    if (!email) continue

    const ok = await enviarEmail({
      to: email,
      subject: 'Un repaso a tus horarios en Confesor',
      html: plantilla(
        'Un repaso a tus horarios',
        `<p>Hola, ${p.display_name}.</p>
         <p>Ha pasado medio año desde la última vez que revisaste tus horarios. Si siguen bien, no
         tienes que hacer nada más que confirmarlo; si han cambiado, puedes corregirlos en un minuto.</p>
         <p>Los fieles reservan a partir de lo que aparece en tu ficha, así que tenerlos al día es
         lo que hace útil el servicio.</p>`,
        { texto: 'Repasar mis horarios', url: `${base}/panel/horarios` }
      ),
      text: `Hola, ${p.display_name}. Ha pasado medio año desde la última vez que revisaste tus horarios en Confesor.\n\nRepásalos aquí: ${base}/panel/horarios`,
    })
    await db.from('priests').update({ schedules_reminded_at: new Date().toISOString() }).eq('id', p.id)
    if (ok) resultado.horarios++
  }

  return NextResponse.json(resultado)
}
