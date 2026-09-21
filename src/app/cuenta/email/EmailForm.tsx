'use client'

import { useActionState } from 'react'
import { cambiarEmail } from '@/app/(auth)/actions'

export function EmailForm() {
  const [state, action, pending] = useActionState(cambiarEmail, undefined)

  if (state?.ok) return <p className="text-sm text-green-800">{state.ok}</p>

  return (
    <form action={action} className="flex flex-col gap-4">
      <div>
        <label htmlFor="email" className="label">
          Email nuevo
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required className="input" />
        <p className="mt-1 text-xs text-muted">
          Te enviaremos un enlace de confirmación a la dirección nueva. El cambio se aplica al pulsarlo.
        </p>
      </div>
      {state?.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? 'Enviando…' : 'Cambiar email'}
      </button>
    </form>
  )
}
