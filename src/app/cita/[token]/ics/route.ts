import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildIcal } from '@/lib/ical'
import { SLOT_TYPE_LABEL } from '@/lib/types'
import type { CitaToken } from '../page'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Fichero .ics de una cita para que el fiel la añada a su calendario
export async function GET(_req: NextRequest, ctx: RouteContext<'/cita/[token]/ics'>) {
  const { token } = await ctx.params
  if (!UUID_RE.test(token)) return new NextResponse('Not found', { status: 404 })

  const supabase = await createClient()
  const { data } = await supabase.rpc('get_appointment_by_token', { p_token: token })
  const cita = (data as CitaToken[] | null)?.[0]
  if (!cita) return new NextResponse('Not found', { status: 404 })

  const base = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  const ics = buildIcal('Confesor', [
    {
      uid: `${cita.id}-fiel@confesor`,
      start: new Date(cita.starts_at),
      end: new Date(cita.ends_at),
      summary: `${SLOT_TYPE_LABEL[cita.type]} con ${cita.priest_name}`,
      description: `Gestiona tu cita: ${base}/cita/${token}`,
      location: `${cita.place_name}, ${cita.address}${cita.city ? `, ${cita.city}` : ''}`,
      status: cita.status === 'pendiente' ? 'TENTATIVE' : 'CONFIRMED',
    },
  ])

  return new NextResponse(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="cita-confesor.ics"',
    },
  })
}
