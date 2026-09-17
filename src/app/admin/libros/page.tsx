import { requireAdmin } from '@/lib/admin'
import type { Book } from '@/lib/recursos'
import { LibroForm } from './LibroForm'
import { LibroItem } from './LibroItem'

export const metadata = { title: 'Libros · Admin' }

export default async function AdminLibrosPage() {
  const { supabase } = await requireAdmin()
  const { data } = await supabase
    .from('books')
    .select('*')
    .order('featured', { ascending: false })
    .order('order_index')
    .order('title')
    .returns<Book[]>()
  const libros = data ?? []

  return (
    <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">Lectura espiritual ({libros.length})</h2>
        {libros.length === 0 ? (
          <p className="card text-sm text-muted">Aún no hay libros.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {libros.map((l) => (
              <LibroItem key={l.id} libro={l} />
            ))}
          </ul>
        )}
      </section>

      <section className="card self-start">
        <h2 className="mb-3 font-semibold">Añadir libro</h2>
        <LibroForm />
      </section>
    </div>
  )
}
