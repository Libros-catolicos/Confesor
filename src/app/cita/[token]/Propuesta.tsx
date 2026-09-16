'use client'

import { useActionState } from 'react'
import { aceptarPropuesta, cancelarCita } from './actions'

export function Propuesta({ token }: { token: string }) {
  const [state, action, pending] = useActionState(aceptarPropuesta, undefined)

  return (
    <div className="mt-4 flex flex-col gap-2">
      {state?.error && <p className="text-sm text-red-700">{state.error}</p>}
      <div className="flex flex-wrap gap-2">
        <form action={action}>
          <input type="hidden" name="token" value={token} />
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? 'Confirmando…' : 'Aceptar la nueva hora'}
          </button>
        </form>
        <form action={cancelarCita}>
          <input type="hidden" name="token" value={token} />
          <button type="submit" className="btn-secondary">
            No me viene bien
          </button>
        </form>
      </div>
    </div>
  )
}
