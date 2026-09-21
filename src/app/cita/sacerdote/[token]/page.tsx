import Link from 'next/link'
import { notFound } from 'next/navigation'
import { MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { fmtFecha, fmtHora } from '@/lib/fechas'
import { nombreIdioma } from '@/lib/idiomas'
import { APPOINTMENT_STATUS_LABEL, SLOT_TYPE_LABEL, type AppointmentStatus, type SlotType } from '@/lib/types'
import { Respuesta } from './Respuesta'

export const metadata = { title: 'Solicitud de cita' }

interface Datos {
  id: string
  status: AppointmentStatus
  type: SlotType
  language: string
  starts_at: string
  ends_at: string
  guest_name: string
  arrived_at: string | null
  priest_name: string
  place_name: string
  address: string
  city: string | null
  timezone: string
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Página a la que llegan los enlaces del email del sacerdote. Funciona sin
// sesión: el token es el secreto. No cambia nada por GET; los botones hacen POST.
export default async function CitaSacerdotePage({ params, searchParams }: PageProps<'/cita/sacerdote/[token]'>) {
  const [{ token }, sp] = await Promise.all([params, searchParams])
  if (!UUID_RE.test(token)) notFound()
  const accion = typeof sp.accion === 'string' ? sp.accion : undefined

  const supabase = await createClient()
  const { data } = await supabase.rpc('get_appointment_notification', { p_token: token })
  const cita = (data as (Datos & { priest_token: string })[] | null)?.[0]
  if (!cita || cita.priest_token !== token) notFound()

  const activa = cita.status === 'pendiente' || cita.status === 'confirmada'
  const futura = new Date(cita.starts_at) > new Date()

  return (
    <div className="mx-auto w-full max-w-lg py-6">
      <p className="text-sm text-muted">Hola, {cita.priest_name}.</p>
      <h1 className="mt-1 text-2xl font-semibold">
        {cita.status === 'pendiente' ? 'Solicitud de cita' : 'Cita'}
      </h1>

      <div className="card mt-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm text-muted">{SLOT_TYPE_LABEL[cita.type]}</p>
            <p className="text-lg font-semibold">{fmtFecha(cita.starts_at, cita.timezone)}</p>
            <p>
              {fmtHora(cita.starts_at, cita.timezone)} – {fmtHora(cita.ends_at, cita.timezone)}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
            {APPOINTMENT_STATUS_LABEL[cita.status]}
          </span>
        </div>

        <dl className="mt-4 grid gap-2 text-sm">
          <div>
            <dt className="text-muted">Fiel</dt>
            <dd>
              <span className="font-medium">{cita.guest_name}</span>
              {cita.arrived_at && <span className="ml-2 text-xs text-green-800">ha avisado de que ha llegado</span>}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Lugar</dt>
            <dd className="flex items-start gap-1.5">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
              <span>
                {cita.place_name}, {cita.address}
                {cita.city ? `, ${cita.city}` : ''}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-muted">Idioma</dt>
            <dd>{nombreIdioma(cita.language)}</dd>
          </div>
        </dl>

        <div className="mt-5 border-t border-border pt-4">
          {activa && futura ? (
            <Respuesta token={token} pendiente={cita.status === 'pendiente'} accionInicial={accion} />
          ) : (
            <p className="text-sm text-muted">Esta cita ya no admite cambios.</p>
          )}
        </div>
      </div>

      <p className="mt-4 text-center text-sm text-muted">
        Para proponer otra hora o ver todas tus citas,{' '}
        <Link href="/panel/citas" className="text-accent underline">
          entra en tu panel
        </Link>
        .
      </p>
    </div>
  )
}
