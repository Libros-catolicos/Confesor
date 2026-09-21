'use client'

import { useActionState, useState } from 'react'
import { CasillaNewsletter, CasillaServicio } from '@/components/Consentimiento'
import { registroFiel } from '../../actions'

export function RegistroFielForm() {
  const [state, action, pending] = useActionState(registroFiel, undefined)
  const [consentido, setConsentido] = useState(false)

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

      <CasillaServicio tipo="faithful" onChange={setConsentido} />
      <CasillaNewsletter />

      {state?.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button type="submit" className="btn-primary" disabled={pending || !consentido}>
        {pending ? 'Creando cuenta…' : 'Crear cuenta'}
      </button>
    </form>
  )
}
