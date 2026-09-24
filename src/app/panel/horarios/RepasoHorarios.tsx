'use client'

import { useActionState } from 'react'
import { CalendarCheck } from 'lucide-react'
import { confirmarHorarios } from '@/app/panel/ficha/actions'

// Cada medio año enviamos un correo pidiendo un repaso de los horarios (nunca de
// las facultades). Este botón deja constancia de que el sacerdote los ha revisado.
export function RepasoHorarios({ confirmadoEl }: { confirmadoEl: string | null }) {
  const [, action, pending] = useActionState(async () => {
    await confirmarHorarios()
  }, undefined)

  const fecha = confirmadoEl
    ? new Date(confirmadoEl).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
    : null

  return (
    <div className="card flex flex-wrap items-center justify-between gap-3 md:col-span-2">
      <p className="text-sm text-muted">
        {fecha ? `Revisaste tus horarios el ${fecha}.` : 'Aún no has confirmado que tus horarios estén al día.'}
      </p>
      <form action={action}>
        <button type="submit" className="btn-secondary" disabled={pending}>
          <CalendarCheck className="h-4 w-4" aria-hidden />
          {pending ? 'Guardando…' : 'Están al día'}
        </button>
      </form>
    </div>
  )
}
