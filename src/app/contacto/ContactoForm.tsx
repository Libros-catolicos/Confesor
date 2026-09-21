'use client'

import { useActionState } from 'react'
import { enviarContacto, type ContactoState } from './actions'

export function ContactoForm() {
  const [state, action, pending] = useActionState<ContactoState, FormData>(enviarContacto, undefined)

  if (state?.ok) return <p className="text-sm text-green-800">{state.ok}</p>

  return (
    <form action={action} className="flex flex-col gap-4">
      {/* Honeypot: oculto para personas, tentador para bots */}
      <div className="absolute -left-[9999px]" aria-hidden>
        <label htmlFor="website">No rellenar</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <div>
        <label htmlFor="nombre" className="label">
          Nombre (opcional)
        </label>
        <input id="nombre" name="nombre" autoComplete="name" className="input" />
      </div>
      <div>
        <label htmlFor="email" className="label">
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="email" required className="input" />
      </div>
      <div>
        <label htmlFor="mensaje" className="label">
          Mensaje
        </label>
        <textarea id="mensaje" name="mensaje" rows={6} required minLength={10} maxLength={3000} className="input" />
      </div>
      {state?.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button type="submit" className="btn-primary self-start" disabled={pending}>
        {pending ? 'Enviando…' : 'Enviar'}
      </button>
    </form>
  )
}
