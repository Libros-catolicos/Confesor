import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { fmtFechaHora } from '@/lib/fechas'
import { SLOT_TYPE_LABEL, type Appointment, type Place } from '@/lib/types'

export const metadata = { title: 'Mi panel' }

type CitaConLugar = Appointment & { places: Pick<Place, 'name' | 'timezone'> | null }

export default async function PanelPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ count: lugares }, { count: reglas }, { data: proximas }] = await Promise.all([
    supabase.from('priest_places').select('*', { count: 'exact', head: true }).eq('priest_id', user!.id),
    supabase.from('availability_rules').select('*', { count: 'exact', head: true }).eq('priest_id', user!.id),
    supabase
      .from('appointments')
      .select('*, places(name, timezone)')
      .eq('priest_id', user!.id)
      .in('status', ['pendiente', 'confirmada'])
      .gte('starts_at', new Date().toISOString())
      .order('starts_at')
      .limit(5)
      .returns<CitaConLugar[]>(),
  ])

  const pasos = [
    { ok: (lugares ?? 0) > 0, label: 'Añade tu parroquia o lugar de atención', href: '/panel/lugares' },
    { ok: (reglas ?? 0) > 0, label: 'Define tus horarios semanales', href: '/panel/horarios' },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="card">
        <h2 className="font-semibold">Primeros pasos</h2>
        <ul className="mt-3 flex flex-col gap-2 text-sm">
          {pasos.map((p) => (
            <li key={p.href} className="flex items-center gap-2">
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-full text-xs ${
                  p.ok ? 'bg-green-100 text-green-800' : 'bg-border text-muted'
                }`}
              >
                {p.ok ? '✓' : '·'}
              </span>
              <Link href={p.href} className={p.ok ? 'text-muted line-through' : 'hover:underline'}>
                {p.label}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h2 className="font-semibold">Próximas citas</h2>
        {!proximas?.length ? (
          <p className="mt-3 text-sm text-muted">No tienes citas próximas.</p>
        ) : (
          <ul className="mt-3 flex flex-col divide-y divide-border text-sm">
            {proximas.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2">
                <div>
                  <p className="font-medium">{c.guest_name}</p>
                  <p className="text-muted">
                    {fmtFechaHora(c.starts_at, c.places?.timezone ?? 'Europe/Madrid')} ·{' '}
                    {SLOT_TYPE_LABEL[c.type]}
                  </p>
                </div>
                <span className="text-xs text-muted">{c.places?.name}</span>
              </li>
            ))}
          </ul>
        )}
        <Link href="/panel/citas" className="mt-3 inline-block text-sm text-accent underline">
          Ver todas
        </Link>
      </section>
    </div>
  )
}
