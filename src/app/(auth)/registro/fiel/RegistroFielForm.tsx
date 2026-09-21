'use client'

import { useActionState } from 'react'
import { registroFiel } from '../../actions'

export function RegistroFielForm() {
  const [state, action, pending] = useActionState(registroFiel, undefined)

  if (state?.ok) {
    return <p className="rounded-lg bg-accent-soft p-4 text-sm">{state.ok}</p>
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <div>
        <label htmlFor="full_name" className="label">
          Nombre
        </label>
        <input
          id="full_name"
          name="full_name"
          autoComplete="given-name"
          required
          placeholder="Basta el nombre de pila"
          className="input"
        />
      </div>
      <div>
        <label htmlFor="email" className="label">
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required className="input" />
      </div>
      <div>
        <label htmlFor="password" className="label">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="input"
        />
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="consent" required className="mt-1 accent-accent" />
        <span>
          Acepto que Confesor guarde mi nombre, mi email y las fechas de mis citas y confesiones para
          gestionarlas y avisarme. Estos datos revelan mis creencias religiosas; solo los veo yo y puedo
          borrar la cuenta y todo su contenido en cualquier momento.
        </span>
      </label>

      {state?.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? 'Creando cuenta…' : 'Crear cuenta'}
      </button>
    </form>
  )
}
