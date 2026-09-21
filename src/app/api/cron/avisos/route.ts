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
  const resultado = { recordatorios: 0, avisos: 0 }

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
    .select('id, full_name, email, reminder_days, last_nudge_at')
    .eq('role', 'fiel')
    .gt('reminder_days', 0)

  for (const f of fieles ?? []) {
    const limite = new Date(Date.now() - f.reminder_days * 86400e3)
    // No repetir el aviso hasta que pase otro periodo completo
    if (f.last_nudge_at && new Date(f.last_nudge_at) > limite) continue

    const [{ data: manual }, { data: citas }] = await Promise.all([
      db.from('confessions').select('confessed_on').eq('user_id', f.id).order('confessed_on', { ascending: false }).limit(1),
      db
        .from('appointments')
        .select('ends_at')
        .eq('user_id', f.id)
        .eq('type', 'confesion')
        .in('status', ['confirmada', 'completada'])
        .lt('ends_at', new Date().toISOString())
        .order('ends_at', { ascending: false })
        .limit(1),
    ])
    const fechas = [manual?.[0]?.confessed_on, citas?.[0]?.ends_at].filter(Boolean).map((d) => new Date(d as string))
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

  return NextResponse.json(resultado)
}
