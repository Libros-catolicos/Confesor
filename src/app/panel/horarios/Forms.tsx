'use client'

import { useActionState } from 'react'
import { WEEKDAYS } from '@/lib/types'
import { crearAusencia, crearRegla } from './actions'

export function ReglaForm({ lugares }: { lugares: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState(crearRegla, undefined)

  return (
    <form action={action} className="mt-4 flex flex-col gap-3">
      {lugares.length > 1 ? (
        <div>
          <label htmlFor="place_id" className="label">
            Lugar
          </label>
          <select id="place_id" name="place_id" className="input">
            {lugares.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <input type="hidden" name="place_id" value={lugares[0].id} />
      )}

      <fieldset>
        <legend className="label">Días</legend>
        <div className="flex gap-1">
          {WEEKDAYS.map((d) => (
            <label
              key={d.value}
              className="flex h-9 flex-1 cursor-pointer items-center justify-center rounded-lg border border-border text-sm has-checked:border-accent has-checked:bg-accent has-checked:text-white"
              title={d.label}
            >
              <input type="checkbox" name="weekday" value={d.value} className="sr-only" />
              {d.short}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="start_time" className="label">
            Desde
          </label>
          <input id="start_time" name="start_time" type="time" required defaultValue="18:00" className="input" />
        </div>
        <div>
          <label htmlFor="end_time" className="label">
            Hasta
          </label>
          <input id="end_time" name="end_time" type="time" required defaultValue="19:00" className="input" />
        </div>
        <div>
          <label htmlFor="slot_minutes" className="label">
            Duración de cada cita
          </label>
          <select id="slot_minutes" name="slot_minutes" defaultValue="20" className="input">
            {[10, 15, 20, 30, 45, 60].map((m) => (
              <option key={m} value={m}>
                {m} minutos
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="type" className="label">
            Tipo
          </label>
          <select id="type" name="type" defaultValue="confesion" className="input">
            <option value="confesion">Confesión</option>
            <option value="conversacion">Conversación</option>
          </select>
        </div>
      </div>

      {state?.error && <p className="text-sm text-red-700">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green-800">{state.ok}</p>}

      <button type="submit" className="btn-primary self-start" disabled={pending}>
        {pending ? 'Guardando…' : 'Añadir tramo'}
      </button>
    </form>
  )
}

export function AusenciaForm() {
  const [state, action, pending] = useActionState(crearAusencia, undefined)
  const hoy = new Date().toISOString().slice(0, 10)

  return (
    <form action={action} className="mt-4 flex flex-col gap-3" key={state?.ok}>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label htmlFor="a_date" className="label">
            Fecha
          </label>
          <input id="a_date" name="date" type="date" required min={hoy} className="input" />
        </div>
        <div>
          <label htmlFor="a_start" className="label">
            Desde
          </label>
          <input id="a_start" name="start_time" type="time" className="input" />
        </div>
        <div>
          <label htmlFor="a_end" className="label">
            Hasta
          </label>
          <input id="a_end" name="end_time" type="time" className="input" />
        </div>
      </div>
      <div>
        <label htmlFor="a_note" className="label">
          Nota (opcional, solo la ves tú)
        </label>
        <input id="a_note" name="note" placeholder="Retiro, viaje, funeral…" className="input" />
      </div>
      <p className="text-xs text-muted">Deja las horas vacías para bloquear el día completo.</p>

      {state?.error && <p className="text-sm text-red-700">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green-800">{state.ok}</p>}

      <button type="submit" className="btn-secondary self-start" disabled={pending}>
        {pending ? 'Guardando…' : 'Añadir ausencia'}
      </button>
    </form>
  )
}
