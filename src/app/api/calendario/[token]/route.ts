import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildIcal, type IcalEvent } from '@/lib/ical'
import { nombreIdioma } from '@/lib/idiomas'
import { SLOT_TYPE_LABEL, type AppointmentStatus, type SlotType } from '@/lib/types'

interface FeedRow {
  id: string
  starts_at: string
  ends_at: string
  type: SlotType
  status: AppointmentStatus
  guest_name: string
  language: string
  arrived_at: string | null
  updated_at: string
  place_name: string
  address: string
  city: string | null
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Feed iCal privado del sacerdote. La URL termina en .ics para que los
// calendarios la reconozcan; el token va en el nombre del fichero.
export async function GET(_req: NextRequest, ctx: RouteContext<'/api/calendario/[token]'>) {
  const { token: raw } = await ctx.params
  const token = raw.replace(/\.ics$/i, '')
  if (!UUID_RE.test(token)) return new NextResponse('Not found', { status: 404 })

  const supabase = await createClient()
  const { data, error } = await supabase.rpc('calendar_feed', { p_token: token })
  if (error) return new NextResponse('Error', { status: 500 })

  const rows = (data ?? []) as FeedRow[]
  const events: IcalEvent[] = rows.map((r) => ({
    uid: `${r.id}@confesor`,
    start: new Date(r.starts_at),
    end: new Date(r.ends_at),
    summary: `${SLOT_TYPE_LABEL[r.type]}: ${r.guest_name}`,
    description: [
      `Idioma: ${nombreIdioma(r.language)}`,
      r.status === 'pendiente' ? 'Pendiente de confirmar en Confesor' : null,
      r.arrived_at ? 'El fiel ha avisado de que ha llegado' : null,
    ]
      .filter(Boolean)
      .join('\n'),
    location: `${r.place_name}, ${r.address}${r.city ? `, ${r.city}` : ''}`,
    status: r.status === 'pendiente' ? 'TENTATIVE' : 'CONFIRMED',
    updated: new Date(r.updated_at),
  }))

  return new NextResponse(buildIcal('Confesor · Citas', events), {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="confesor.ics"',
      'Cache-Control': 'private, max-age=300',
    },
  })
}
