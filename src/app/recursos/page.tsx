import Link from 'next/link'
import { BookOpen, ExternalLink } from 'lucide-react'
import { listarArticulos, listarLibros, SECCIONES } from '@/lib/recursos'

export const metadata = {
  title: 'Recursos',
  description:
    'Qué es la confesión, cómo prepararla, examen de conciencia, cómo confesarse y lecturas recomendadas.',
}

export default async function RecursosPage() {
  const [articulos, libros] = await Promise.all([listarArticulos(), listarLibros()])

  return (
    <div className="flex flex-col gap-10 py-4">
      <section className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight">Recursos</h1>
        <p className="mx-auto mt-2 max-w-xl text-muted">
          Para preparar bien la confesión, entender qué es y resolver las dudas más habituales.
        </p>
      </section>

      {SECCIONES.map((s) => {
        const lista = articulos.filter((a) => a.section === s.id)
        if (lista.length === 0) return null
        return (
          <section key={s.id}>
            <h2 className="mb-3 text-lg font-semibold">{s.titulo}</h2>
            <ul className="grid gap-3 sm:grid-cols-2">
              {lista.map((a) => (
                <li key={a.slug}>
                  <Link href={`/recursos/${a.slug}`} className="card block h-full transition-shadow hover:shadow-md">
                    <h3 className="font-medium">{a.title}</h3>
                    {a.summary && <p className="mt-1 text-sm text-muted">{a.summary}</p>}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )
      })}

      {libros.length > 0 && (
        <section>
          <h2 className="mb-1 flex items-center gap-2 text-lg font-semibold">
            <BookOpen className="h-5 w-5 text-accent" aria-hidden />
            Lectura espiritual
          </h2>
          <p className="mb-3 text-sm text-muted">
            Libros que ayudan a vivir mejor el sacramento y la vida interior.{' '}
            <span className="rounded bg-border px-1.5 py-0.5 text-xs font-medium text-foreground">Contenido comercial</span>
          </p>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {libros.map((l) => (
              <li key={l.id} className={`card flex gap-4 ${l.featured ? 'border-accent/40 bg-accent-soft/40' : ''}`}>
                {l.cover_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={l.cover_url}
                    alt=""
                    className="h-28 w-20 shrink-0 rounded object-cover shadow-sm"
                    loading="lazy"
                  />
                )}
                <div className="min-w-0">
                  <h3 className="font-medium">{l.title}</h3>
                  {l.author && <p className="text-sm text-muted">{l.author}</p>}
                  {l.description && <p className="mt-2 text-sm">{l.description}</p>}
                  {l.url && (
                    <a
                      href={l.url}
                      target="_blank"
                      rel={l.affiliate ? 'sponsored noopener' : 'noopener'}
                      className="mt-2 inline-flex items-center gap-1 text-sm text-accent underline"
                    >
                      Conseguirlo
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                    </a>
                  )}
                  {l.affiliate && (
                    <span className="ml-2 text-xs text-muted">Enlace de afiliado</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
