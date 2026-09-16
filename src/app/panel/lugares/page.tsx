import { MapPin, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { TIMEZONES, type Place } from '@/lib/types'
import { LugarForm } from './LugarForm'
import { quitarLugar } from './actions'

export const metadata = { title: 'Lugares' }

export default async function LugaresPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data } = await supabase
    .from('priest_places')
    .select('places(*)')
    .eq('priest_id', user!.id)
    .returns<{ places: Place }[]>()
  const lugares = (data ?? []).map((r) => r.places).filter(Boolean)

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <section className="card">
        <h2 className="font-semibold">Mis lugares</h2>
        <p className="mt-1 text-sm text-muted">
          Parroquias o centros donde atiendes. Los fieles los encontrarán por cercanía.
        </p>
        {lugares.length === 0 ? (
          <p className="mt-4 text-sm text-muted">Aún no has añadido ninguno.</p>
        ) : (
          <ul className="mt-4 flex flex-col divide-y divide-border">
            {lugares.map((pl) => (
              <li key={pl.id} className="flex items-start justify-between gap-3 py-3">
                <div className="text-sm">
                  <p className="font-medium">{pl.name}</p>
                  <p className="mt-0.5 flex items-start gap-1.5 text-muted">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
                    <span>
                      {pl.address}
                      {pl.city ? `, ${pl.city}` : ''}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {TIMEZONES.find((t) => t.value === pl.timezone)?.label ?? pl.timezone}
                  </p>
                </div>
                <form action={quitarLugar}>
                  <input type="hidden" name="place_id" value={pl.id} />
                  <button
                    type="submit"
                    className="rounded p-1.5 text-muted hover:bg-red-50 hover:text-red-700"
                    title="Quitar lugar"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card">
        <h2 className="font-semibold">Añadir lugar</h2>
        <p className="mt-1 text-sm text-muted">
          Localizamos la dirección automáticamente en el mapa.
        </p>
        <LugarForm />
      </section>
    </div>
  )
}
