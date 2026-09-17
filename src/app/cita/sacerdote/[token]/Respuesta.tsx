'use client'

import { useActionState, useState } from 'react'
import { responderSacerdote, type RespuestaState } from './actions'

export function Respuesta({ token, pendiente, accionInicial }: { token: string; pendiente: boolean; accionInicial?: string }) {
  const [state, action, pending] = useActionState<RespuestaState, FormData>(responderSacerdote, undefined)
  const [rechazando, setRechazando] = useState(accionInicial === 'rechazar')

  if (state?.ok) return <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800">{state.ok}</p>

  return (
    <div className="flex flex-col gap-3">
      {state?.error && <p className="text-sm text-red-700">{state.error}</p>}

      {!rechazando ? (
        <div className="flex flex-wrap gap-2">
          {pendiente && (
            <form action={action}>
              <input type="hidden" name="token" value={token} />
              <input type="hidden" name="accion" value="confirmar" />
              <button type="submit" className="btn-primary" disabled={pending} autoFocus={accionInicial === 'confirmar'}>
                {pending ? 'Confirmando…' : 'Confirmar la cita'}
              </button>
            </form>
          )}
          <button type="button" onClick={() => setRechazando(true)} className="btn-secondary text-red-700">
            {pendiente ? 'Rechazar' : 'Cancelar la cita'}
          </button>
        </div>
      ) : (
        <form action={action} className="flex flex-col gap-3 rounded-lg bg-accent-soft p-3">
          <input type="hidden" name="token" value={token} />
          <input type="hidden" name="accion" value="rechazar" />
          <div>
            <label htmlFor="message" className="label">
              Mensaje para el fiel (opcional)
            </label>
            <input id="message" name="message" maxLength={300} placeholder="Lo siento, ese día no puedo…" className="input" />
          </div>
          <p className="text-xs text-muted">
            Si prefieres proponerle otra hora en lugar de rechazar, hazlo desde tu panel de citas.
          </p>
          <div className="flex gap-2">
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? 'Enviando…' : pendiente ? 'Rechazar la cita' : 'Cancelar la cita'}
            </button>
            <button type="button" onClick={() => setRechazando(false)} className="btn-secondary">
              Volver
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
