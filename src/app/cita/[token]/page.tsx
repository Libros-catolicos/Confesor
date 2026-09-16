import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CalendarCheck, MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { fmtFecha, fmtHora } from '@/lib/fechas'
import { nombreIdioma } from '@/lib/idiomas'
import {
  APPOINTMENT_STATUS_LABEL,
  SLOT_TYPE_LABEL,
  type AppointmentStatus,
  type SlotType,
} from '@/lib/types'
import { cancelarCita } from './actions'

export const metadata = { title: 'Tu cita' }

interface CitaToken {
  id: string
  starts_at: string
  ends_at: string
  type: SlotType
  language: string
  status: AppointmentStatus
  guest_name: string
  priest_name: string
  priest_slug: string
  place_name: string
  address: string
  city: string | null
  timezone: string
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function CitaPage({ params, searchParams }: PageProps<'/cita/[token]'>) {
  const [{ token }, sp] = await Promise.all([params, searchParams])
  if (!UUID_RE.test(token)) notFound()

  const supabase = await createClient()
  const { data } = await supabase.rpc('get_appointment_by_token', { p_token: token })
  const cita = (data as CitaToken[] | null)?.[0]
  if (!cita) notFound()

  const nueva = sp.nueva === '1'
  const activa = cita.status === 'pendiente' || cita.status === 'confirmada'
  const futura = new Date(cita.starts_at) > new Date()

  return (
    <div className="mx-auto w-full max-w-lg py-6">
      {nueva && activa && (
        <div className="mb-4 flex items-start gap-3 rounded-lg bg-green-50 p-4 text-sm text-green-900">
          <CalendarCheck className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
          <div>
            <p className="font-medium">Cita reservada, {cita.guest_name}.</p>
            <p className="mt-1">
              Guarda esta página: desde aquí puedes consultar o cancelar la cita. El enlace es
              privado; no lo compartas.
            </p>
          </div>
        </div>
      )}

      <div className="card">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted">{SLOT_TYPE_LABEL[cita.type]}</p>
            <h1 className="text-xl font-semibold">{fmtFecha(cita.starts_at, cita.timezone)}</h1>
            <p className="text-lg">
              {fmtHora(cita.starts_at, cita.timezone)} – {fmtHora(cita.ends_at, cita.timezone)}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
              activa ? 'bg-accent-soft text-accent' : 'bg-border text-muted'
            }`}
          >
            {APPOINTMENT_STATUS_LABEL[cita.status]}
          </span>
        </div>

        <dl className="mt-5 grid gap-3 text-sm">
          <div>
            <dt className="text-muted">Sacerdote</dt>
            <dd>
              <Link href={`/s/${cita.priest_slug}`} className="text-accent underline">
                {cita.priest_name}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-muted">Lugar</dt>
            <dd className="flex items-start gap-1.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
              <span>
                {cita.place_name}
                <br />
                <span className="text-muted">
                  {cita.address}
                  {cita.city ? `, ${cita.city}` : ''}
                </span>
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-muted">Idioma</dt>
            <dd>{nombreIdioma(cita.language)}</dd>
          </div>
        </dl>

        {activa && futura && (
          <form action={cancelarCita} className="mt-6 border-t border-border pt-4">
            <input type="hidden" name="token" value={token} />
            <p className="mb-2 text-sm text-muted">
              Si no vas a poder acudir, cancela para liberar el hueco.
            </p>
            <button type="submit" className="btn-secondary text-red-700">
              Cancelar la cita
            </button>
          </form>
        )}

        {cita.status === 'cancelada' && (
          <p className="mt-6 border-t border-border pt-4 text-sm text-muted">
            Esta cita está cancelada.{' '}
            <Link href={`/s/${cita.priest_slug}`} className="text-accent underline">
              Reservar otra
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
