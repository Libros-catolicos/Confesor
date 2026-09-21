import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CalendarCheck, CalendarPlus, MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { fmtFecha, fmtFechaHora, fmtHora } from '@/lib/fechas'
import { nombreIdioma } from '@/lib/idiomas'
import {
  APPOINTMENT_STATUS_LABEL,
  SLOT_TYPE_LABEL,
  type AppointmentStatus,
  type SlotType,
} from '@/lib/types'
import { cancelarCita, cambiarRecordatorio } from './actions'
import { Propuesta } from './Propuesta'

export const metadata = { title: 'Tu cita' }

export interface CitaToken {
  id: string
  starts_at: string
  ends_at: string
  type: SlotType
  language: string
  status: AppointmentStatus
  guest_name: string
  cancelled_by: 'sacerdote' | 'fiel' | null
  cancel_message: string | null
  proposed_starts_at: string | null
  proposed_ends_at: string | null
  priest_name: string
  priest_slug: string
  place_name: string
  address: string
  city: string | null
  timezone: string
  reminder_opt_in: boolean
  has_email: boolean
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
            <p className="font-medium">
              {cita.status === 'pendiente'
                ? `Solicitud enviada, ${cita.guest_name}. El sacerdote la confirmará.`
                : `Cita reservada, ${cita.guest_name}.`}
            </p>
            <p className="mt-1">
              Guarda esta página: desde aquí puedes consultar o cancelar la cita. El enlace es
              privado; no lo compartas.
            </p>
          </div>
        </div>
      )}

      {cita.status === 'reprogramar' && cita.proposed_starts_at && (
        <div className="mb-4 rounded-lg bg-blue-50 p-4 text-sm text-blue-900">
          <p className="font-medium">{cita.priest_name} no puede atenderte a la hora reservada.</p>
          {cita.cancel_message && <p className="mt-1 italic">«{cita.cancel_message}»</p>}
          <p className="mt-2">
            Te propone: <span className="font-medium">{fmtFechaHora(cita.proposed_starts_at, cita.timezone)}</span>
          </p>
          <Propuesta token={token} />
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
            {cita.status === 'pendiente' ? 'Pendiente de confirmar' : APPOINTMENT_STATUS_LABEL[cita.status]}
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

        {activa && futura && cita.has_email && (
          <form action={cambiarRecordatorio} className="mt-5 flex items-center gap-2 border-t border-border pt-4 text-sm">
            <input type="hidden" name="token" value={token} />
            <input type="hidden" name="enabled" value={String(!cita.reminder_opt_in)} />
            <span>
              Recordatorio por correo el día antes: <strong>{cita.reminder_opt_in ? 'activado' : 'desactivado'}</strong>
            </span>
            <button type="submit" className="text-accent underline">
              {cita.reminder_opt_in ? 'Desactivar' : 'Activar'}
            </button>
          </form>
        )}

        {activa && futura && (
          <div className="mt-6 flex flex-wrap items-center gap-3 border-t border-border pt-4">
            <a href={`/cita/${token}/ics`} className="btn-secondary">
              <CalendarPlus className="h-4 w-4" />
              Añadir a mi calendario
            </a>
            <form action={cancelarCita}>
              <input type="hidden" name="token" value={token} />
              <button type="submit" className="btn-secondary text-red-700">
                Cancelar la cita
              </button>
            </form>
          </div>
        )}

        {cita.status === 'cancelada' && (
          <p className="mt-6 border-t border-border pt-4 text-sm text-muted">
            {cita.cancelled_by === 'sacerdote' ? (
              <>
                El sacerdote ha tenido que cancelar esta cita.
                {cita.cancel_message && <> Mensaje: «{cita.cancel_message}»</>}
              </>
            ) : (
              'Esta cita está cancelada.'
            )}{' '}
            <Link href={`/s/${cita.priest_slug}`} className="text-accent underline">
              Reservar otra
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}
