'use client'

import { useActionState, useState } from 'react'
import { fmtFechaHora } from '@/lib/fechas'
import type { FreeSlot } from '@/lib/types'
import { cancelarCita } from './actions'

export function CancelarCita({
  cita,
  huecos,
  timezone,
}: {
  cita: { id: string; place_id: string; starts_at: string }
  huecos: FreeSlot[]
  timezone: string
}) {
  const [abierto, setAbierto] = useState(false)
  const [state, action, pending] = useActionState(cancelarCita, undefined)

  if (state?.ok) return <p className="text-sm text-green-800">{state.ok}</p>

  if (!abierto) {
    return (
      <button type="button" onClick={() => setAbierto(true)} className="btn-secondary">
        Cancelar o proponer otra hora
      </button>
    )
  }

  return (
    <form action={action} className="flex w-full flex-col gap-3 rounded-lg bg-accent-soft p-3">
      <input type="hidden" name="id" value={cita.id} />

      <div>
        <label htmlFor={`new-${cita.id}`} className="label">
          Proponer otra hora (opcional)
        </label>
        <select id={`new-${cita.id}`} name="new_starts_at" className="input" defaultValue="">
          <option value="">Solo cancelar, sin proponer</option>
          {huecos.slice(0, 200).map((h) => (
            <option key={h.starts_at} value={h.starts_at}>
              {fmtFechaHora(h.starts_at, timezone)}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-muted">
          El fiel recibirá la propuesta y podrá aceptarla o rechazarla. El hueco actual queda libre.
        </p>
      </div>

      <div>
        <label htmlFor={`msg-${cita.id}`} className="label">
          Mensaje para el fiel (opcional)
        </label>
        <input
          id={`msg-${cita.id}`}
          name="message"
          placeholder="Me ha surgido un imprevisto…"
          className="input"
          maxLength={300}
        />
      </div>

      {state?.error && <p className="text-sm text-red-700">{state.error}</p>}

      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? 'Enviando…' : 'Confirmar'}
        </button>
        <button type="button" onClick={() => setAbierto(false)} className="btn-secondary">
          Volver
        </button>
      </div>
    </form>
  )
}
