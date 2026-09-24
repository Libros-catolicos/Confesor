'use client'

import { useActionState, useState } from 'react'
import { CasillaFacultades, CasillaNewsletter, CasillaServicio } from '@/components/Consentimiento'
import { registro } from '../../actions'
import { IDIOMAS } from '@/lib/idiomas'

export function RegistroForm() {
  const [state, action, pending] = useActionState(registro, undefined)
  const [consentido, setConsentido] = useState(false)
  const [declarado, setDeclarado] = useState(false)

  if (state?.ok) {
    return <p className="rounded-lg bg-accent-soft p-4 text-sm">{state.ok}</p>
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <div>
        <label htmlFor="full_name" className="label">
          Nombre completo
        </label>
        <input
          id="full_name"
          name="full_name"
          autoComplete="name"
          required
          placeholder="P. Juan Pérez"
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
      <fieldset>
        <legend className="label">Idiomas en los que atiendes</legend>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {IDIOMAS.map((i) => (
            <label key={i.code} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="languages"
                value={i.code}
                defaultChecked={i.code === 'es'}
                className="accent-accent"
              />
              {i.nombre}
            </label>
          ))}
        </div>
      </fieldset>
      <CasillaServicio tipo="priest" onChange={setConsentido} />
      <CasillaFacultades onChange={setDeclarado} />
      <CasillaNewsletter />
      {state?.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button type="submit" className="btn-primary" disabled={pending || !consentido || !declarado}>
        {pending ? 'Creando cuenta…' : 'Crear cuenta'}
      </button>
    </form>
  )
}
