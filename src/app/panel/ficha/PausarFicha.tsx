'use client'

import { useActionState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cambiarPausa, type FichaState } from './actions'

// El sacerdote decide por sí mismo cuándo su ficha deja de estar visible: si le
// suspenden las facultades para confesar, por enfermedad, traslado o ausencia larga.
export function PausarFicha({ pausada }: { pausada: boolean }) {
  const [state, action, pending] = useActionState<FichaState, FormData>(cambiarPausa, undefined)

  return (
    <form action={action}>
      <input type="hidden" name="pausar" value={pausada ? 'no' : 'si'} />
      {pausada ? (
        <>
          <p className="flex items-center gap-2 text-sm font-medium text-amber-800">
            <EyeOff className="h-4 w-4" aria-hidden />
            Tu ficha está en pausa
          </p>
          <p className="mt-1 text-sm text-muted">
            No aparece en las búsquedas y nadie puede reservar contigo. Tus parroquias y horarios se
            conservan tal como los dejaste.
          </p>
          <button type="submit" className="btn-primary mt-3" disabled={pending}>
            <Eye className="h-4 w-4" aria-hidden />
            {pending ? 'Publicando…' : 'Volver a publicar mi ficha'}
          </button>
        </>
      ) : (
        <>
          <p className="text-sm font-medium">Pausar mi ficha</p>
          <p className="mt-1 text-sm text-muted">
            Ocúltala al instante si te suspenden las facultades para confesar, si estás enfermo o si
            vas a ausentarte una temporada. No se borra nada y puedes volver cuando quieras.
          </p>
          <button type="submit" className="btn-secondary mt-3" disabled={pending}>
            <EyeOff className="h-4 w-4" aria-hidden />
            {pending ? 'Pausando…' : 'Pausar mi ficha'}
          </button>
        </>
      )}
      {state?.error && <p className="mt-2 text-sm text-red-700">{state.error}</p>}
      {state?.ok && <p className="mt-2 text-sm text-green-800">{state.ok}</p>}
    </form>
  )
}
