'use client'

import { useActionState } from 'react'
import { recuperarContrasena } from '../actions'

export function RecuperarForm() {
  const [state, action, pending] = useActionState(recuperarContrasena, undefined)

  if (state?.ok) return <p className="text-sm text-green-800">{state.ok}</p>

  return (
    <form action={action} className="flex flex-col gap-4">
      <div>
        <label htmlFor="email" className="label">
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required className="input" />
      </div>
      {state?.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? 'Enviando…' : 'Enviar enlace'}
      </button>
    </form>
  )
}
