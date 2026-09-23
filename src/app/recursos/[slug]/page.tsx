import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { leerArticulo, listarArticulos, SECCIONES } from '@/lib/recursos'

export async function generateMetadata({ params }: PageProps<'/recursos/[slug]'>) {
  const { slug } = await params
  const a = await leerArticulo(slug)
  return { title: a?.title ?? 'Recursos', description: a?.summary ?? undefined }
}

export default async function ArticuloPage({ params }: PageProps<'/recursos/[slug]'>) {
  const { slug } = await params
  const articulo = await leerArticulo(slug)
  if (!articulo) notFound()

  const todos = await listarArticulos()
  const relacionados = todos.filter((a) => a.section === articulo.section && a.slug !== slug)
  const seccion = SECCIONES.find((s) => s.id === articulo.section)

  return (
    <div className="mx-auto w-full max-w-2xl py-4">
      <Link href="/recursos" className="inline-flex items-center gap-1 text-sm text-muted hover:text-accent">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Recursos
      </Link>

      <article className="mt-4">
        {seccion && <p className="text-xs font-medium uppercase tracking-wide text-accent">{seccion.titulo}</p>}
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{articulo.title}</h1>
        {articulo.summary && <p className="mt-2 text-muted">{articulo.summary}</p>}
        <div className="prosa mt-6" dangerouslySetInnerHTML={{ __html: articulo.html }} />
      </article>

      <div className="mt-10 rounded-xl bg-accent-soft p-5 text-center">
        <p className="font-medium">¿Quieres confesarte?</p>
        <p className="mt-1 text-sm text-muted">Encuentra un sacerdote cerca de ti y reserva cita: no es necesario registrarse.</p>
        <Link href="/buscar" className="btn-primary mt-3">
          Buscar sacerdote
        </Link>
      </div>

      {relacionados.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-2 text-sm font-semibold text-muted">También en {seccion?.titulo.toLowerCase()}</h2>
          <ul className="flex flex-col gap-1 text-sm">
            {relacionados.map((a) => (
              <li key={a.slug}>
                <Link href={`/recursos/${a.slug}`} className="text-accent underline">
                  {a.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
