'use client'

import { useState } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import type { Book } from '@/lib/contenido'
import { LibroForm } from './LibroForm'
import { borrarLibro } from './actions'

export function LibroItem({ libro }: { libro: Book }) {
  const [editando, setEditando] = useState(false)

  if (editando) {
    return (
      <li className="card">
        <LibroForm libro={libro} onDone={() => setEditando(false)} />
      </li>
    )
  }

  return (
    <li className="card flex items-start gap-4">
      {libro.cover_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={libro.cover_url} alt="" className="h-20 w-14 shrink-0 rounded object-cover shadow-sm" />
      ) : (
        <div className="flex h-20 w-14 shrink-0 items-center justify-center rounded bg-accent-soft text-xs text-muted">
          Sin portada
        </div>
      )}
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-medium">
          {libro.title}
          {libro.featured && (
            <span className="ml-2 rounded-full bg-accent-soft px-1.5 py-0.5 text-xs text-accent">Destacado</span>
          )}
          {!libro.published && (
            <span className="ml-2 rounded-full bg-border px-1.5 py-0.5 text-xs text-muted">Oculto</span>
          )}
        </p>
        {libro.author && <p className="text-muted">{libro.author}</p>}
        {libro.description && <p className="mt-1 line-clamp-2 text-muted">{libro.description}</p>}
        {libro.url && (
          <a href={libro.url} target="_blank" rel="noreferrer" className="mt-1 block truncate text-xs text-accent underline">
            {libro.url}
          </a>
        )}
      </div>
      <div className="flex shrink-0 flex-col gap-1">
        <button
          type="button"
          onClick={() => setEditando(true)}
          className="rounded p-1.5 text-muted hover:bg-accent-soft hover:text-accent"
          title="Editar"
        >
          <Pencil className="h-4 w-4" />
        </button>
        <form
          action={borrarLibro}
          onSubmit={(e) => {
            if (!confirm(`¿Borrar «${libro.title}»?`)) e.preventDefault()
          }}
        >
          <input type="hidden" name="id" value={libro.id} />
          <button type="submit" className="rounded p-1.5 text-muted hover:bg-red-50 hover:text-red-700" title="Borrar">
            <Trash2 className="h-4 w-4" />
          </button>
        </form>
      </div>
    </li>
  )
}
