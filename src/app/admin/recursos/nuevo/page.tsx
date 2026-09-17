import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requireAdmin } from '@/lib/admin'
import { ArticuloForm } from '../ArticuloForm'

export const metadata = { title: 'Nuevo artículo · Admin' }

export default async function NuevoArticuloPage() {
  await requireAdmin()
  return (
    <div className="flex flex-col gap-4">
      <Link href="/admin/recursos" className="inline-flex items-center gap-1 text-sm text-muted hover:text-accent">
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Artículos
      </Link>
      <section className="card">
        <h2 className="mb-4 font-semibold">Nuevo artículo</h2>
        <ArticuloForm />
      </section>
    </div>
  )
}
