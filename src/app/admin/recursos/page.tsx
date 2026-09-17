import Link from 'next/link'
import { Plus } from 'lucide-react'
import { requireAdmin } from '@/lib/admin'
import { SECCIONES, type Article } from '@/lib/recursos'

export const metadata = { title: 'Recursos · Admin' }

export default async function AdminRecursosPage() {
  const { supabase } = await requireAdmin()
  const { data } = await supabase
    .from('articles')
    .select('*')
    .order('section')
    .order('order_index')
    .order('title')
    .returns<Article[]>()
  const articulos = data ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          Los artículos se escriben en Markdown. El orden dentro de cada sección lo marca el campo «orden».
        </p>
        <Link href="/admin/recursos/nuevo" className="btn-primary shrink-0">
          <Plus className="h-4 w-4" />
          Nuevo artículo
        </Link>
      </div>

      {SECCIONES.map((s) => {
        const lista = articulos.filter((a) => a.section === s.id)
        return (
          <section key={s.id} className="card">
            <h2 className="font-semibold">{s.titulo}</h2>
            {lista.length === 0 ? (
              <p className="mt-2 text-sm text-muted">Sin artículos.</p>
            ) : (
              <ul className="mt-2 divide-y divide-border text-sm">
                {lista.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-2">
                    <div className="min-w-0">
                      <Link href={`/admin/recursos/${a.id}`} className="font-medium hover:underline">
                        {a.title}
                      </Link>
                      <p className="truncate text-xs text-muted">
                        /recursos/{a.slug} · orden {a.order_index} · actualizado{' '}
                        {new Date(a.updated_at).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
                        a.published ? 'bg-green-50 text-green-800' : 'bg-border text-muted'
                      }`}
                    >
                      {a.published ? 'Publicado' : 'Borrador'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )
      })}
    </div>
  )
}
