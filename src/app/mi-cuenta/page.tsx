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
interface Confesion {
  id: string
  confessed_on: string
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
  const [{ data: ultima }, { data: proximas }, { data: pasadas }, { data: confesiones }] = await Promise.all([
    supabase.rpc('last_confession'),
    supabase
      .from('appointments')
      .select('id, starts_at, type, status, manage_token, places(name, timezone)')
      .eq('user_id', user.id)
      .in('status', ['pendiente', 'confirmada', 'reprogramar'])
      .gte('starts_at', ahora)
      .order('starts_at')
      .returns<CitaConLugar[]>(),
    supabase
      .from('appointments')
      .select('id, starts_at, type, status, manage_token, places(name, timezone)')
      .eq('user_id', user.id)
      .lt('starts_at', ahora)
      .order('starts_at', { ascending: false })
      .limit(20)
      .returns<CitaConLugar[]>(),
    supabase.from('confessions').select('id, confessed_on').eq('user_id', user.id).order('confessed_on', { ascending: false }).limit(50).returns<Confesion[]>(),
  ])
  const ultimaFecha = (ultima as string | null) ?? null

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
          {confesiones && confesiones.length > 0 && (
            <details className="mt-4 text-sm">
              <summary className="cursor-pointer text-muted">Fechas anotadas ({confesiones.length})</summary>
              <ul className="mt-2 divide-y divide-border">
                {confesiones.map((c) => (
                  <li key={c.id} className="flex items-center justify-between py-1.5">
                    {fmtDia(c.confessed_on)}
                    <form action={borrarConfesion}>
                      <input type="hidden" name="id" value={c.id} />
                      <button type="submit" className="rounded p-1 text-muted hover:bg-red-50 hover:text-red-700" title="Quitar">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </details>
          )}
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
          {pasadas && pasadas.length > 0 && (
            <details className="mt-4 text-sm">
              <summary className="cursor-pointer text-muted">Citas anteriores ({pasadas.length})</summary>
              <ul className="mt-2 divide-y divide-border">
                {pasadas.map((c) => (
                  <li key={c.id} className="py-1.5 text-muted">
                    {fmtFechaHora(c.starts_at, c.places?.timezone ?? 'Europe/Madrid')} · {SLOT_TYPE_LABEL[c.type]} ·{' '}
                    {c.places?.name}
                    {c.status === 'cancelada' && ' (cancelada)'}
                  </li>
                ))}
              </ul>
            </details>
          )}
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
            Guardamos tu nombre, tu email y las fechas de tus citas y confesiones. Nada más. Ningún
            sacerdote ve tu historial.
          </p>
          <div className="mt-4">
            <BorrarCuenta />
          </div>
        </section>
      </div>
    </div>
  )
}
