'use client'

import { useActionState, useState } from 'react'
import type { Book } from '@/lib/contenido'
import { guardarLibro, type LibroState } from './actions'

export function LibroForm({ libro, onDone }: { libro?: Book; onDone?: () => void }) {
  const [state, action, pending] = useActionState<LibroState, FormData>(guardarLibro, undefined)
  const [preview, setPreview] = useState<string | null>(libro?.cover_url ?? null)

  return (
    <form action={action} className="flex flex-col gap-3" key={libro ? undefined : state?.ok}>
      {libro && <input type="hidden" name="id" value={libro.id} />}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`title-${libro?.id ?? 'n'}`} className="label">
            Título
          </label>
          <input id={`title-${libro?.id ?? 'n'}`} name="title" required defaultValue={libro?.title ?? ''} className="input" />
        </div>
        <div>
          <label htmlFor={`author-${libro?.id ?? 'n'}`} className="label">
            Autor
          </label>
          <input id={`author-${libro?.id ?? 'n'}`} name="author" defaultValue={libro?.author ?? ''} className="input" />
        </div>
      </div>

      <div>
        <label htmlFor={`desc-${libro?.id ?? 'n'}`} className="label">
          Descripción (dos o tres líneas)
        </label>
        <textarea
          id={`desc-${libro?.id ?? 'n'}`}
          name="description"
          rows={3}
          maxLength={400}
          defaultValue={libro?.description ?? ''}
          className="input"
        />
      </div>

      <div>
        <label htmlFor={`url-${libro?.id ?? 'n'}`} className="label">
          Enlace de compra
        </label>
        <input
          id={`url-${libro?.id ?? 'n'}`}
          name="url"
          type="url"
          placeholder="https://…"
          defaultValue={libro?.url ?? ''}
          className="input"
        />
      </div>

      <div className="flex flex-wrap items-start gap-4">
        {preview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="h-28 w-20 rounded object-cover shadow-sm" />
        )}
        <div className="flex-1">
          <label htmlFor={`cover-${libro?.id ?? 'n'}`} className="label">
            Portada (JPG, PNG o WebP, máx. 2 MB)
          </label>
          <input
            id={`cover-${libro?.id ?? 'n'}`}
            name="cover"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="block w-full text-sm text-muted file:mr-3 file:rounded-lg file:border file:border-border file:bg-card file:px-3 file:py-1.5 file:text-sm file:text-foreground"
            onChange={(e) => {
              const f = e.target.files?.[0]
              setPreview(f ? URL.createObjectURL(f) : (libro?.cover_url ?? null))
            }}
          />
          {libro?.cover_url && (
            <label className="mt-2 flex items-center gap-2 text-xs text-muted">
              <input type="checkbox" name="remove_cover" className="accent-accent" />
              Quitar la portada actual
            </label>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="featured" defaultChecked={libro?.featured ?? false} className="accent-accent" />
          Destacado (se muestra primero, resaltado)
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="published" defaultChecked={libro?.published ?? true} className="accent-accent" />
          Publicado
        </label>
        <label className="flex items-center gap-2">
          Orden
          <input
            name="order_index"
            type="number"
            min={1}
            max={999}
            defaultValue={libro?.order_index ?? 99}
            className="input w-20"
          />
        </label>
      </div>

      {state?.error && <p className="text-sm text-red-700">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green-800">{state.ok}</p>}

      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? 'Guardando…' : libro ? 'Guardar' : 'Añadir libro'}
        </button>
        {onDone && (
          <button type="button" onClick={onDone} className="btn-secondary">
            Cerrar
          </button>
        )}
      </div>
    </form>
  )
}
