import { marked } from 'marked'
import { LEGAL_UPDATED, LEGAL_VERSION } from '@/lib/legal'

/** Página legal estática: título, texto Markdown (literal del documento legal) y pie con versión y fecha. */
export async function PaginaLegal({ titulo, markdown }: { titulo: string; markdown: string }) {
  const html = await marked.parse(markdown)
  return (
    <article className="mx-auto w-full max-w-2xl py-4">
      <h1 className="text-3xl font-semibold tracking-tight">{titulo}</h1>
      <div className="prosa mt-6" dangerouslySetInnerHTML={{ __html: html }} />
      <p className="mt-10 border-t border-border pt-4 text-xs text-muted">
        Versión {LEGAL_VERSION} · Última actualización: {LEGAL_UPDATED}.
      </p>
    </article>
  )
}
