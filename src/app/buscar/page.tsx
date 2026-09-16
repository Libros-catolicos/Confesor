import Link from 'next/link'
import { MapPin, Clock } from 'lucide-react'
import { SearchForm } from '@/components/SearchForm'
import { createClient } from '@/lib/supabase/server'
import { geocode, reverseGeocode } from '@/lib/geocode'
import { nombreIdioma } from '@/lib/idiomas'
import type { SearchResult, SlotType } from '@/lib/types'

export const metadata = { title: 'Buscar sacerdote' }

function num(v: string | undefined) {
  const n = v ? parseFloat(v) : NaN
  return Number.isFinite(n) ? n : undefined
}

export default async function BuscarPage({ searchParams }: PageProps<'/buscar'>) {
  const sp = await searchParams
  const q = typeof sp.q === 'string' ? sp.q : undefined
  const idioma = typeof sp.idioma === 'string' && sp.idioma ? sp.idioma : undefined
  const tipo = typeof sp.tipo === 'string' && sp.tipo ? (sp.tipo as SlotType) : undefined
  const radio = num(typeof sp.radio === 'string' ? sp.radio : undefined) ?? 25

  let lat = num(typeof sp.lat === 'string' ? sp.lat : undefined)
  let lng = num(typeof sp.lng === 'string' ? sp.lng : undefined)
  let etiqueta: string | null = null
  let error: string | null = null

  if (lat === undefined || lng === undefined) {
    if (q) {
      const g = await geocode(q)
      if (g) {
        lat = g.lat
        lng = g.lng
        etiqueta = g.label
      } else {
        error = `No hemos encontrado "${q}". Prueba con una ciudad o una dirección más concreta.`
      }
    }
  } else {
    etiqueta = await reverseGeocode(lat, lng)
  }

  let resultados: SearchResult[] = []
  if (lat !== undefined && lng !== undefined) {
    const supabase = await createClient()
    const { data, error: e } = await supabase.rpc('search_priests', {
      p_lat: lat,
      p_lng: lng,
      p_radius_km: radio,
      p_languages: idioma ? [idioma] : null,
      p_type: tipo ?? null,
    })
    if (e) error = 'Error al buscar. Inténtalo de nuevo en unos segundos.'
    else resultados = (data ?? []) as SearchResult[]
  }

  const hayBusqueda = lat !== undefined && lng !== undefined

  return (
    <div className="flex flex-col gap-6">
      <section className="card">
        <SearchForm
          compact
          defaults={{ q: q ?? '', idioma: idioma ?? '', tipo: tipo ?? '', radio: String(radio) }}
        />
      </section>

      {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      {hayBusqueda && !error && (
        <section>
          <p className="mb-3 text-sm text-muted">
            {resultados.length === 0
              ? 'No hay sacerdotes verificados con huecos en los próximos 14 días en esta zona.'
              : `${resultados.length} resultado${resultados.length === 1 ? '' : 's'}`}
            {etiqueta && (
              <>
                {' '}
                cerca de <span className="text-foreground">{etiqueta}</span>
              </>
            )}
          </p>

          <ul className="grid gap-3 sm:grid-cols-2">
            {resultados.map((r) => (
              <li key={`${r.priest_id}-${r.place_id}`}>
                <Link
                  href={`/s/${r.slug}?lugar=${r.place_id}`}
                  className="card block transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="font-semibold">{r.display_name}</h2>
                      <p className="mt-0.5 text-sm text-muted">{r.place_name}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
                      {r.distance_km < 1
                        ? `${Math.round(r.distance_km * 1000)} m`
                        : `${r.distance_km.toFixed(1)} km`}
                    </span>
                  </div>

                  <p className="mt-2 flex items-center gap-1.5 text-sm text-muted">
                    <MapPin className="h-4 w-4 shrink-0" />
                    {r.address}
                    {r.city ? `, ${r.city}` : ''}
                  </p>

                  <p className="mt-1 flex items-center gap-1.5 text-sm">
                    <Clock className="h-4 w-4 shrink-0 text-muted" />
                    {r.free_slots > 0 ? (
                      <>
                        {r.free_slots} hueco{r.free_slots === 1 ? '' : 's'} en 14 días
                      </>
                    ) : (
                      <span className="text-muted">Sin huecos próximos</span>
                    )}
                  </p>

                  <p className="mt-2 flex flex-wrap gap-1">
                    {r.languages.map((l) => (
                      <span
                        key={l}
                        className="rounded border border-border px-1.5 py-0.5 text-xs text-muted"
                      >
                        {nombreIdioma(l)}
                      </span>
                    ))}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!hayBusqueda && !error && (
        <p className="text-center text-sm text-muted">
          Escribe una ubicación o pulsa el icono para usar la tuya.
        </p>
      )}
    </div>
  )
}
