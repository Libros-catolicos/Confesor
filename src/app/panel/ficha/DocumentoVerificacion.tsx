'use client'

import { useActionState } from 'react'
import { FileCheck, Upload } from 'lucide-react'
import { fmtFecha } from '@/lib/fechas'
import { quitarDocumento, subirDocumento } from './actions'

interface Props {
  subidoEl: string | null
  urlVer: string | null // enlace firmado temporal, solo si hay documento
}

// Celebret o documento equivalente. Opcional: agiliza la verificación.
// Nunca se publica; solo lo ve el equipo de Confesor.
export function DocumentoVerificacion({ subidoEl, urlVer }: Props) {
  const [state, action, pending] = useActionState(subirDocumento, undefined)

  return (
    <section className="card">
      <h2 className="font-semibold">Celebret o documento equivalente</h2>
      <p className="mt-1 text-sm text-muted">
        Opcional. Una foto o PDF de tu <em>celebret</em>, carta de tu diócesis o nombramiento
        agiliza la verificación de tu ficha. Solo lo ve el equipo de Confesor: no se publica y se
        borra si cierras la cuenta.
      </p>

      {subidoEl ? (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-lg bg-accent-soft p-3 text-sm">
          <FileCheck className="h-5 w-5 shrink-0 text-accent" aria-hidden />
          <span>Documento subido el {fmtFecha(subidoEl, 'Europe/Madrid')}.</span>
          {urlVer && (
            <a href={urlVer} target="_blank" rel="noopener noreferrer" className="text-accent underline">
              Ver
            </a>
          )}
          <form action={quitarDocumento}>
            <button type="submit" className="text-muted underline">
              Quitar
            </button>
          </form>
        </div>
      ) : null}

      <form action={action} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="file"
          name="documento"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          required
          className="input text-sm file:mr-3 file:rounded-md file:border-0 file:bg-accent-soft file:px-3 file:py-1 file:text-accent"
        />
        <button type="submit" className="btn-secondary shrink-0" disabled={pending}>
          <Upload className="h-4 w-4" aria-hidden />
          {pending ? 'Subiendo…' : subidoEl ? 'Sustituir' : 'Subir'}
        </button>
      </form>
      <p className="mt-1 text-xs text-muted">JPG, PNG, WebP o PDF, hasta 5 MB.</p>
      {state?.error && <p className="mt-2 text-sm text-red-700">{state.error}</p>}
      {state?.ok && <p className="mt-2 text-sm text-green-800">{state.ok}</p>}
    </section>
  )
}
