'use client'

import { useActionState } from 'react'
import { MapPin } from 'lucide-react'
import { TIMEZONES } from '@/lib/types'
import { lugarAction, type LugarState } from './actions'

export function LugarForm() {
  const [state, action, pending] = useActionState<LugarState, FormData>(lugarAction, { paso: 'buscar' })

  if (state.paso === 'hecho') {
    return (
      <form action={action} className="mt-4 flex flex-col gap-3">
        <input type="hidden" name="accion" value="volver" />
        <p className="text-sm text-green-800">{state.ok}</p>
        <button type="submit" className="btn-secondary self-start">
          Añadir otro
        </button>
      </form>
    )
  }

  if (state.paso === 'elegir') {
    const v = state.valores
    return (
      <form action={action} className="mt-4 flex flex-col gap-3">
        <p className="text-sm">
          <span className="font-medium">{v.name}</span> · {v.address}
          {v.city ? `, ${v.city}` : ''}
        </p>
        <fieldset>
          <legend className="label">¿Cuál de estas ubicaciones es la correcta?</legend>
          <div className="flex flex-col gap-1.5">
            {state.candidatos.map((c, i) => (
              <label
                key={i}
                className="flex cursor-pointer items-start gap-2 rounded-lg border border-border p-2 text-sm has-checked:border-accent has-checked:bg-accent-soft"
              >
                <input type="radio" name="candidato" value={i} defaultChecked={i === 0} className="mt-1 accent-accent" />
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted" aria-hidden />
                <span>
                  {c.label}
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${c.lat}&mlon=${c.lng}#map=18/${c.lat}/${c.lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-2 text-xs text-accent underline"
                  >
                    ver mapa
                  </a>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {state.error && <p className="text-sm text-red-700">{state.error}</p>}

        <div className="flex gap-2">
          <button type="submit" name="accion" value="crear" className="btn-primary" disabled={pending}>
            {pending ? 'Guardando…' : 'Guardar lugar'}
          </button>
          <button type="submit" name="accion" value="volver" className="btn-secondary" disabled={pending}>
            Cambiar dirección
          </button>
        </div>
      </form>
    )
  }

  return (
    <form action={action} className="mt-4 flex flex-col gap-3">
      <input type="hidden" name="accion" value="buscar" />
      <div>
        <label htmlFor="name" className="label">
          Nombre
        </label>
        <input id="name" name="name" required placeholder="Parroquia de San Ginés" className="input" />
      </div>
      <div>
        <label htmlFor="address" className="label">
          Dirección
        </label>
        <input id="address" name="address" required placeholder="Calle Arenal, 13" className="input" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="city" className="label">
            Ciudad
          </label>
          <input id="city" name="city" placeholder="Madrid" className="input" />
        </div>
        <div>
          <label htmlFor="timezone" className="label">
            Zona horaria
          </label>
          <select id="timezone" name="timezone" defaultValue="Europe/Madrid" className="input">
            {TIMEZONES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {state.error && <p className="text-sm text-red-700">{state.error}</p>}

      <button type="submit" className="btn-primary self-start" disabled={pending}>
        {pending ? 'Localizando…' : 'Buscar en el mapa'}
      </button>
    </form>
  )
}
