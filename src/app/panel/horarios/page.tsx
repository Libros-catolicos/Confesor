import Link from 'next/link'
import { Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { horaCorta } from '@/lib/fechas'
import {
  SLOT_TYPE_LABEL,
  WEEKDAYS,
  type Absence,
  type AvailabilityRule,
  type Place,
} from '@/lib/types'
import { ReglaForm, AusenciaForm } from './Forms'
import { alternarRegla, borrarAusencia, borrarRegla } from './actions'

export const metadata = { title: 'Horarios' }

export default async function HorariosPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: pp }, { data: rules }, { data: absences }] = await Promise.all([
    supabase
      .from('priest_places')
      .select('places(id, name)')
      .eq('priest_id', user!.id)
      .returns<{ places: Pick<Place, 'id' | 'name'> }[]>(),
    supabase
      .from('availability_rules')
      .select('*')
      .eq('priest_id', user!.id)
      .order('weekday')
      .order('start_time')
      .returns<AvailabilityRule[]>(),
    supabase
      .from('absences')
      .select('*')
      .eq('priest_id', user!.id)
      .gte('date', new Date().toISOString().slice(0, 10))
      .order('date')
      .returns<Absence[]>(),
  ])

  const lugares = (pp ?? []).map((r) => r.places).filter(Boolean)

  if (lugares.length === 0) {
    return (
      <p className="card text-sm">
        Antes de definir horarios necesitas{' '}
        <Link href="/panel/lugares" className="text-accent underline">
          añadir un lugar
        </Link>
        .
      </p>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="flex flex-col gap-4">
        <section className="card">
          <h2 className="font-semibold">Horario semanal</h2>
          <p className="mt-1 text-sm text-muted">
            Tramos que se repiten cada semana. De cada tramo salen huecos de la duración indicada.
          </p>

          {lugares.map((pl) => {
            const reglas = (rules ?? []).filter((r) => r.place_id === pl.id)
            if (reglas.length === 0) return null
            return (
              <div key={pl.id} className="mt-4">
                <h3 className="text-sm font-medium">{pl.name}</h3>
                <ul className="mt-1 divide-y divide-border text-sm">
                  {reglas.map((r) => (
                    <li
                      key={r.id}
                      className={`flex items-center justify-between gap-2 py-2 ${r.active ? '' : 'opacity-50'}`}
                    >
                      <span>
                        <span className="inline-block w-20 font-medium">
                          {WEEKDAYS.find((w) => w.value === r.weekday)?.label}
                        </span>
                        {horaCorta(r.start_time)}–{horaCorta(r.end_time)}
                        <span className="ml-2 text-xs text-muted">
                          {SLOT_TYPE_LABEL[r.type]} · {r.slot_minutes} min
                        </span>
                      </span>
                      <span className="flex items-center gap-1">
                        <form action={alternarRegla}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="active" value={String(!r.active)} />
                          <button type="submit" className="rounded px-2 py-1 text-xs text-muted hover:bg-accent-soft">
                            {r.active ? 'Pausar' : 'Activar'}
                          </button>
                        </form>
                        <form action={borrarRegla}>
                          <input type="hidden" name="id" value={r.id} />
                          <button
                            type="submit"
                            className="rounded p-1.5 text-muted hover:bg-red-50 hover:text-red-700"
                            title="Borrar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </form>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
          {(rules ?? []).length === 0 && (
            <p className="mt-4 text-sm text-muted">Aún no tienes ningún tramo.</p>
          )}
        </section>

        <section className="card">
          <h2 className="font-semibold">Ausencias</h2>
          <p className="mt-1 text-sm text-muted">
            Días o tramos en los que no atenderás aunque haya horario.
          </p>
          {(absences ?? []).length > 0 && (
            <ul className="mt-3 divide-y divide-border text-sm">
              {absences!.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 py-2">
                  <span>
                    <span className="font-medium">
                      {new Date(a.date + 'T00:00:00').toLocaleDateString('es-ES', {
                        weekday: 'short',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>{' '}
                    {a.start_time ? `${horaCorta(a.start_time)}–${horaCorta(a.end_time!)}` : 'todo el día'}
                    {a.note && <span className="ml-2 text-xs text-muted">{a.note}</span>}
                  </span>
                  <form action={borrarAusencia}>
                    <input type="hidden" name="id" value={a.id} />
                    <button
                      type="submit"
                      className="rounded p-1.5 text-muted hover:bg-red-50 hover:text-red-700"
                      title="Borrar"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
          <AusenciaForm />
        </section>
      </div>

      <section className="card self-start">
        <h2 className="font-semibold">Añadir tramo</h2>
        <ReglaForm lugares={lugares} />
      </section>
    </div>
  )
}
