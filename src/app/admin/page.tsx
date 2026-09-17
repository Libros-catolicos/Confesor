import Link from 'next/link'
import { requireAdmin } from '@/lib/admin'

export const metadata = { title: 'Administración' }

export default async function AdminPage() {
  const { supabase } = await requireAdmin()
  const hace30dias = new Date()
  hace30dias.setDate(hace30dias.getDate() - 30)

  const [pendientes, verificados, citas, articulos, libros] = await Promise.all([
    supabase.from('priests').select('*', { count: 'exact', head: true }).eq('status', 'pendiente'),
    supabase.from('priests').select('*', { count: 'exact', head: true }).eq('status', 'verificado'),
    supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', hace30dias.toISOString()),
    supabase.from('articles').select('*', { count: 'exact', head: true }),
    supabase.from('books').select('*', { count: 'exact', head: true }),
  ])

  const tarjetas = [
    {
      href: '/admin/sacerdotes?estado=pendiente',
      valor: pendientes.count ?? 0,
      label: 'sacerdotes pendientes de verificar',
      alerta: (pendientes.count ?? 0) > 0,
    },
    { href: '/admin/sacerdotes', valor: verificados.count ?? 0, label: 'sacerdotes verificados' },
    { href: '/admin/sacerdotes', valor: citas.count ?? 0, label: 'citas reservadas en 30 días' },
    { href: '/admin/recursos', valor: articulos.count ?? 0, label: 'artículos en Recursos' },
    { href: '/admin/libros', valor: libros.count ?? 0, label: 'libros de lectura espiritual' },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {tarjetas.map((t) => (
        <Link
          key={t.label}
          href={t.href}
          className={`card transition-shadow hover:shadow-md ${t.alerta ? 'border-amber-300 bg-amber-50' : ''}`}
        >
          <p className="text-3xl font-semibold">{t.valor}</p>
          <p className="text-sm text-muted">{t.label}</p>
        </Link>
      ))}
    </div>
  )
}
