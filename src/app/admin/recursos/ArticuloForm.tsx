'use client'

import { useActionState } from 'react'
import { SECCIONES, type Article } from '@/lib/contenido'
import { crearArticulo, guardarArticulo, type ArticuloState } from './actions'

export function ArticuloForm({ articulo }: { articulo?: Article }) {
  const [state, action, pending] = useActionState<ArticuloState, FormData>(
    articulo ? guardarArticulo : crearArticulo,
    undefined
  )

  return (
    <form action={action} className="flex flex-col gap-4">
      {articulo && <input type="hidden" name="id" value={articulo.id} />}

      <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
        <div>
          <label htmlFor="title" className="label">
            Título
          </label>
          <input id="title" name="title" required defaultValue={articulo?.title ?? ''} className="input" />
        </div>
        <div>
          <label htmlFor="section" className="label">
            Sección
          </label>
          <select id="section" name="section" defaultValue={articulo?.section ?? 'confesion'} className="input">
            {SECCIONES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.titulo}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="summary" className="label">
          Resumen (una o dos frases; aparece en la lista y en buscadores)
        </label>
        <input id="summary" name="summary" defaultValue={articulo?.summary ?? ''} className="input" maxLength={200} />
      </div>

      <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr]">
        <div>
          <label htmlFor="slug" className="label">
            URL (slug)
          </label>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted">/recursos/</span>
            <input
              id="slug"
              name="slug"
              defaultValue={articulo?.slug ?? ''}
              placeholder="se genera del título"
              className="input font-mono text-xs"
            />
          </div>
        </div>
        <div>
          <label htmlFor="order_index" className="label">
            Orden
          </label>
          <input
            id="order_index"
            name="order_index"
            type="number"
            min={1}
            max={999}
            defaultValue={articulo?.order_index ?? 99}
            className="input"
          />
        </div>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input type="checkbox" name="published" defaultChecked={articulo?.published ?? true} className="accent-accent" />
          Publicado
        </label>
      </div>

      <div>
        <label htmlFor="body_md" className="label">
          Contenido (Markdown)
        </label>
        <textarea
          id="body_md"
          name="body_md"
          rows={22}
          defaultValue={articulo?.body_md ?? ''}
          className="input font-mono text-xs leading-relaxed"
          spellCheck
        />
        <p className="mt-1 text-xs text-muted">
          <code>## Título</code> para apartados · <code>**negrita**</code> · <code>*cursiva*</code> ·{' '}
          <code>- lista</code> · <code>1. lista numerada</code> · <code>&gt; cita</code> ·{' '}
          <code>[texto](/recursos/otro-articulo)</code> para enlaces.
        </p>
      </div>

      {state?.error && <p className="text-sm text-red-700">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green-800">{state.ok}</p>}

      <div className="flex flex-wrap items-center gap-2">
        <button type="submit" className="btn-primary" disabled={pending}>
          {pending ? 'Guardando…' : articulo ? 'Guardar cambios' : 'Crear artículo'}
        </button>
        {articulo && (
          <a href={`/recursos/${articulo.slug}`} target="_blank" rel="noreferrer" className="btn-secondary">
            Ver en la web
          </a>
        )}
      </div>
    </form>
  )
}
