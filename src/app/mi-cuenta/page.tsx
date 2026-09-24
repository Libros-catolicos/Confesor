import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/app/(auth)/actions'
import { fmtFechaHora } from '@/lib/fechas'
import { homeForRole, SLOT_TYPE_LABEL, type Appointment, type Place, type Profile } from '@/lib/types'
import { AvisosForm, BorrarCuenta, ConfesionForm } from './Forms'
import { borrarConfesion } from './actions'

export const metadata = { title: 'Mi cuenta', robots: { index: false, follow: false } }

type CitaConLugar = Pick<Appointment, 'id' | 'starts_at' | 'type' | 'status' | 'manage_token'> & {
  places: Pick<Place, 'name' | 'timezone'> | null
}
function diasDesde(fecha: string) {
  const ms = Date.now() - new Date(fecha + 'T12:00:00').getTime()
  return Math.max(0, Math.floor(ms / 86400000))
}

function fmtDia(fecha: string) {
  return new Date(fecha + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function MiCuentaPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/mi-cuenta')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single<Profile>()
  if (!profile) redirect('/login')
  if (profile.role !== 'fiel') redirect(homeForRole(profile.role))

  const ahora = new Date().toISOString()
  // Solo las citas próximas: las pasadas se borran y de la confesión queda una fecha
  const { data: proximas } = await supabase
    .from('appointments')
    .select('id, starts_at, type, status, manage_token, places(name, timezone)')
    .eq('user_id', user.id)
    .in('status', ['pendiente', 'confirmada', 'reprogramar'])
    .gte('starts_at', ahora)
    .order('starts_at')
    .returns<CitaConLugar[]>()
  const ultimaFecha = profile.last_confession_on

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Hola, {profile.full_name}</h1>
          <p className="text-xs text-muted">{profile.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/cuenta/email" className="text-sm text-muted underline hover:text-accent">
            Email
          </Link>
          <Link href="/cuenta/contrasena" className="text-sm text-muted underline hover:text-accent">
            Contraseña
          </Link>
          <form action={logout}>
            <button type="submit" className="btn-secondary">
              Salir
            </button>
          </form>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <section className="card">
          <h2 className="font-semibold">Última confesión</h2>
          {ultimaFecha ? (
            <p className="mt-2">
              <span className="text-3xl font-semibold">
                {diasDesde(ultimaFecha) === 0 ? 'Hoy' : `Hace ${diasDesde(ultimaFecha)} día${diasDesde(ultimaFecha) === 1 ? '' : 's'}`}
              </span>
              <br />
              <span className="text-sm text-muted">{fmtDia(ultimaFecha)}</span>
            </p>
          ) : (
            <p className="mt-2 text-sm text-muted">Aún no hay ninguna anotada.</p>
          )}
          <div className="mt-4 border-t border-border pt-4">
            <ConfesionForm />
          </div>
          {ultimaFecha && (
            <form action={borrarConfesion} className="mt-3">
              <button type="submit" className="flex items-center gap-1.5 text-xs text-muted underline hover:text-red-700">
                <Trash2 className="h-3.5 w-3.5" aria-hidden />
                Borrar la fecha
              </button>
            </form>
          )}
          <p className="mt-3 text-xs text-muted">Guardamos únicamente esta fecha, no un historial.</p>
        </section>

        <section className="card">
          <h2 className="font-semibold">Próximas citas</h2>
          {!proximas?.length ? (
            <p className="mt-2 text-sm text-muted">
              No tienes citas.{' '}
              <Link href="/buscar" className="text-accent underline">
                Buscar sacerdote
              </Link>
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-border text-sm">
              {proximas.map((c) => (
                <li key={c.id} className="py-2">
                  <Link href={`/cita/${c.manage_token}`} className="font-medium text-accent underline">
                    {fmtFechaHora(c.starts_at, c.places?.timezone ?? 'Europe/Madrid')}
                  </Link>
                  <p className="text-muted">
                    {SLOT_TYPE_LABEL[c.type]} · {c.places?.name}
                    {c.status === 'pendiente' && ' · pendiente de confirmar'}
                    {c.status === 'reprogramar' && ' · el sacerdote propone otra hora'}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-muted">
            Las citas pasadas se borran a los 7 días; no guardamos historial.
          </p>
        </section>

        <section className="card">
          <h2 className="font-semibold">Avisos por email</h2>
          <div className="mt-3">
            <AvisosForm notify={profile.notify_appointments} reminderDays={profile.reminder_days} />
          </div>
        </section>

        <section className="card">
          <h2 className="font-semibold">Tus datos</h2>
          <p className="mt-2 text-sm text-muted">
            Guardamos tu nombre, tu email, tus citas próximas y la fecha de tu última confesión.
            Nada más: ni historial de citas ni de confesiones.
          </p>
          <div className="mt-4">
            <BorrarCuenta />
          </div>
        </section>
      </div>
    </div>
  )
}
