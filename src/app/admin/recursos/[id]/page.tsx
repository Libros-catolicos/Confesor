import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { requireAdmin } from '@/lib/admin'
import type { Article } from '@/lib/recursos'
import { ArticuloForm } from '../ArticuloForm'
import { borrarArticulo } from '../actions'

export const metadata = { title: 'Editar artículo · Admin' }

export default async function EditarArticuloPage({ params, searchParams }: PageProps<'/admin/recursos/[id]'>) {
  const [{ id }, sp] = await Promise.all([params, searchParams])
  const { supabase } = await requireAdmin()
  const { data: articulo } = await supabase.from('articles').select('*').eq('id', id).maybeSingle<Article>()
  if (!articulo) notFound()

  return (
    <div className="flex flex-col gap-4">
      <Link href="/admin/recursos" className="inline-flex items-center gap-1 text-sm text-muted hover:text-accent">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Artículos
      </Link>
      {sp.ok === '1' && <p className="rounded-lg bg-green-50 p-3 text-sm text-green-800">Artículo creado.</p>}
      <section className="card">
        <h2 className="mb-4 font-semibold">Editar artículo</h2>
        <ArticuloForm articulo={articulo} />
      </section>
      <form action={borrarArticulo} className="self-end">
        <input type="hidden" name="id" value={articulo.id} />
        <button type="submit" className="text-sm text-red-700 underline">
          Borrar este artículo
        </button>
      </form>
    </div>
  )
}
