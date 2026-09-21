import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { fmtFechaHora, fmtHora } from '@/lib/fechas'
import { nombreIdioma } from '@/lib/idiomas'
import {
  APPOINTMENT_STATUS_LABEL,
  SLOT_TYPE_LABEL,
  type Appointment,
  type FreeSlot,
  type Place,
} from '@/lib/types'
import { confirmarCita, marcarCompletada, marcarNoPresentado } from './actions'
import { CancelarCita } from './CancelarCita'

export const metadata = { title: 'Citas' }

type CitaConLugar = Omit<Appointment, 'guest_email' | 'manage_token' | 'user_id' | 'reminder_sent_at' | 'reminder_opt_in' | 'created_at' | 'updated_at'> & {
  places: Pick<Place, 'id' | 'name' | 'timezone'> | null
}

const ESTILO: Record<string, string> = {
  pendiente: 'bg-amber-50 text-amber-800',
  confirmada: 'bg-green-50 text-green-800',
  reprogramar: 'bg-blue-50 text-blue-800',
  cancelada: 'bg-border text-muted',
  completada: 'bg-border text-muted',
  no_presentado: 'bg-border text-muted',
}

export default async function CitasPage({ searchParams }: PageProps<'/panel/citas'>) {
  const sp = await searchParams
  const vista = sp.vista === 'pasadas' ? 'pasadas' : 'proximas'

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const ahora = new Date().toISOString()
  const hoy = new Date()
  const fin = new Date(hoy)
  fin.setDate(fin.getDate() + 30)
  const iso = (d: Date) => d.toISOString().slice(0, 10)

  let q = supabase
    .from('appointments')
    .select('id, priest_id, place_id, starts_at, ends_at, type, language, status, guest_name, cancelled_by, cancel_message, proposed_starts_at, proposed_ends_at, for_minor, arrived_at, places(id, name, timezone)')
    .eq('priest_id', user!.id)
  q =
    vista === 'pasadas'
      ? q.lt('starts_at', ahora).order('starts_at', { ascending: false }).limit(50)
      : q.gte('starts_at', ahora).order('starts_at')

  const [{ data: citas }, { data: slots }] = await Promise.all([
    q.returns<CitaConLugar[]>(),
    vista === 'proximas'
      ? supabase.rpc('priest_free_slots', {
          p_priest_id: user!.id,
          p_from: iso(hoy),
          p_to: iso(fin),
          p_apply_notice: false,
        })
      : Promise.resolve({ data: [] }),
  ])
  const huecos = (slots ?? []) as FreeSlot[]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1 text-sm">
        {(
          [
            ['proximas', 'Próximas'],
            ['pasadas', 'Pasadas'],
          ] as const
        ).map(([v, label]) => (
          <Link
            key={v}
            href={v === 'proximas' ? '/panel/citas' : '/panel/citas?vista=pasadas'}
            className={`rounded-lg px-3 py-1.5 ${vista === v ? 'bg-accent text-white' : 'text-muted hover:bg-accent-soft'}`}
          >
            {label}
          </Link>
        ))}
      </div>

      {!citas?.length ? (
        <p className="card text-sm text-muted">
          {vista === 'proximas' ? 'No tienes citas próximas.' : 'No hay citas pasadas.'}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {citas.map((c) => {
            const tz = c.places?.timezone ?? 'Europe/Madrid'
            const activa = c.status === 'pendiente' || c.status === 'confirmada'
            const pasada = new Date(c.ends_at) < new Date()
            return (
              <li key={c.id} className="card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="text-sm">
                    <p className="text-base font-medium">{fmtFechaHora(c.starts_at, tz)}</p>
                    <p className="text-muted">
                      {SLOT_TYPE_LABEL[c.type]} · {c.places?.name} · {nombreIdioma(c.language)}
                    </p>
                    <p className="mt-2">
                      <span className="font-medium">{c.guest_name}</span>
                      {c.for_minor && <span className="ml-2 text-xs text-muted">(cita para un menor, reserva su tutor)</span>}
                      {c.arrived_at && (
                        <span className="ml-2 rounded-full bg-green-50 px-1.5 py-0.5 text-xs text-green-800">
                          Ha llegado · {fmtHora(c.arrived_at, tz)}
                        </span>
                      )}
                    </p>
                    {c.status === 'reprogramar' && c.proposed_starts_at && (
                      <p className="mt-1 text-xs text-blue-800">
                        Propuesta: {fmtFechaHora(c.proposed_starts_at, tz)} · esperando respuesta del fiel
                      </p>
                    )}
                    {c.status === 'cancelada' && (
                      <p className="mt-1 text-xs text-muted">
                        {c.cancelled_by === 'fiel'
                          ? 'Cancelada por el fiel'
                          : c.cancelled_by === 'sacerdote'
                            ? 'Cancelada por ti'
                            : 'Cancelada'}
                        {c.cancel_message ? `: ${c.cancel_message}` : ''}
                      </p>
                    )}
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${ESTILO[c.status]}`}>
                    {APPOINTMENT_STATUS_LABEL[c.status]}
                  </span>
                </div>

                {activa && !pasada && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
                    {c.status === 'pendiente' && (
                      <form action={confirmarCita}>
                        <input type="hidden" name="id" value={c.id} />
                        <button type="submit" className="btn-primary">
                          Confirmar
                        </button>
                      </form>
                    )}
                    <CancelarCita
                      cita={{ id: c.id, place_id: c.place_id, starts_at: c.starts_at }}
                      huecos={huecos.filter((h) => h.place_id === c.place_id && h.starts_at !== c.starts_at)}
                      timezone={tz}
                    />
                  </div>
                )}

                {activa && pasada && (
                  <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                    <form action={marcarCompletada}>
                      <input type="hidden" name="id" value={c.id} />
                      <button type="submit" className="btn-secondary">
                        Se realizó
                      </button>
                    </form>
                    <form action={marcarNoPresentado}>
                      <input type="hidden" name="id" value={c.id} />
                      <button type="submit" className="btn-secondary text-muted">
                        No se presentó
                      </button>
                    </form>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
