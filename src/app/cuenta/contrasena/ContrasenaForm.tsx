'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { cambiarContrasena } from '@/app/(auth)/actions'

export function ContrasenaForm({ volver }: { volver: string }) {
  const [state, action, pending] = useActionState(cambiarContrasena, undefined)

  if (state?.ok) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-green-800">{state.ok}</p>
        <Link href={volver} className="btn-primary self-start">
          Continuar
        </Link>
      </div>
    )
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <div>
        <label htmlFor="password" className="label">
          Contraseña nueva
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
      <div>
        <label htmlFor="password2" className="label">
          Repite la contraseña
        </label>
        <input
          id="password2"
          name="password2"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          className="input"
        />
      </div>
      {state?.error && <p className="text-sm text-red-700">{state.error}</p>}
      <button type="submit" className="btn-primary" disabled={pending}>
        {pending ? 'Guardando…' : 'Guardar contraseña'}
      </button>
    </form>
  )
}
