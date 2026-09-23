import { notFound } from 'next/navigation'
import { MapPin, Languages } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { nombreIdioma } from '@/lib/idiomas'
import { horaCorta } from '@/lib/fechas'
import {
  SLOT_TYPE_LABEL,
  WEEKDAYS,
  type AvailabilityRule,
  type FreeSlot,
  type Place,
  type Priest,
} from '@/lib/types'
import { RUTAS_RESERVADAS } from '@/lib/slug'
import { SlotPicker } from './SlotPicker'

export async function generateMetadata({ params }: PageProps<'/[slug]'>) {
  const { slug } = await params
  if (RUTAS_RESERVADAS.has(slug)) return {}
  const supabase = await createClient()
  const { data } = await supabase.from('priests').select('display_name').eq('slug', slug).maybeSingle()
  return { title: data?.display_name ?? 'Sacerdote' }
}

type PlaceLite = Pick<Place, 'id' | 'name' | 'address' | 'city' | 'timezone'>

export default async function PriestPage({ params, searchParams }: PageProps<'/[slug]'>) {
  const [{ slug }, sp] = await Promise.all([params, searchParams])
  // La ficha cuelga de la raíz: nunca debe responder por una ruta de la aplicación
  if (RUTAS_RESERVADAS.has(slug)) notFound()
  const lugarInicial = typeof sp.lugar === 'string' ? sp.lugar : undefined

  const supabase = await createClient()
  const { data: priest } = await supabase
    .from('priests')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'verificado')
    .maybeSingle<Priest>()
  if (!priest) notFound()

  const hoy = new Date()
  const fin = new Date(hoy)
  fin.setDate(fin.getDate() + 14)
  const iso = (d: Date) => d.toISOString().slice(0, 10)

  const [{ data: pp }, { data: rules }, { data: slots }] = await Promise.all([
    supabase
      .from('priest_places')
      .select('places(id, name, address, city, timezone)')
      .eq('priest_id', priest.id)
      .returns<{ places: PlaceLite }[]>(),
    supabase
      .from('availability_rules')
      .select('*')
      .eq('priest_id', priest.id)
      .eq('active', true)
      .order('weekday')
      .order('start_time')
      .returns<AvailabilityRule[]>(),
    supabase.rpc('priest_free_slots', { p_priest_id: priest.id, p_from: iso(hoy), p_to: iso(fin) }),
  ])

  const places = (pp ?? []).map((r) => r.places).filter(Boolean)

  // Si hay sesión de fiel, el formulario se rellena solo
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: perfil } = user
    ? await supabase.from('profiles').select('role, full_name, email').eq('id', user.id).maybeSingle()
    : { data: null }
  const fiel = perfil?.role === 'fiel' ? { nombre: perfil.full_name, email: perfil.email } : undefined

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_1.3fr]">
      <aside className="flex flex-col gap-4">
        <div className="card">
          <h1 className="text-2xl font-semibold">{priest.display_name}</h1>
          {priest.diocese && <p className="text-sm text-muted">Diócesis de {priest.diocese}</p>}
          {priest.bio && <p className="mt-3 text-sm leading-relaxed">{priest.bio}</p>}

          <p className="mt-4 flex flex-wrap items-center gap-1.5 text-sm">
            <Languages className="h-4 w-4 text-muted" aria-hidden />
            {priest.languages.map((l) => (
              <span key={l} className="rounded border border-border px-1.5 py-0.5 text-xs">
                {nombreIdioma(l)}
              </span>
            ))}
          </p>
        </div>

        {places.map((pl) => {
          const reglas = (rules ?? []).filter((r) => r.place_id === pl.id)
          return (
            <div key={pl.id} className="card">
              <h2 className="font-medium">{pl.name}</h2>
              <p className="mt-1 flex items-start gap-1.5 text-sm text-muted">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                <span>
                  {pl.address}
                  {pl.city ? `, ${pl.city}` : ''}
                </span>
              </p>
              {reglas.length > 0 && (
                <ul className="mt-3 flex flex-col gap-1 text-sm">
                  {reglas.map((r) => (
                    <li key={r.id} className="flex justify-between gap-2">
                      <span>
                        {WEEKDAYS.find((w) => w.value === r.weekday)?.label}{' '}
                        <span className="text-muted">
                          {horaCorta(r.start_time)}–{horaCorta(r.end_time)}
                        </span>
                      </span>
                      <span className="text-xs text-muted">{SLOT_TYPE_LABEL[r.type]}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })}
      </aside>

      <section className="card">
        <h2 className="font-semibold">Reservar cita</h2>
        <p className="mt-1 text-sm text-muted">
          Horas en la hora local de la parroquia. Solo pedimos un nombre y un contacto.
        </p>
        <SlotPicker
          priestId={priest.id}
          languages={priest.languages}
          places={places}
          slots={(slots ?? []) as FreeSlot[]}
          lugarInicial={lugarInicial}
          fiel={fiel}
        />
      </section>
    </div>
  )
}
