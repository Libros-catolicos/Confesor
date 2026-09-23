import Link from 'next/link'
import { requireAdmin } from '@/lib/admin'
import { logout } from '@/app/(auth)/actions'

// Zona privada: fuera de los buscadores (además del robots.txt)
export const metadata = { robots: { index: false, follow: false } }

const NAV = [
  { href: '/admin', label: 'Resumen' },
  { href: '/admin/sacerdotes', label: 'Sacerdotes' },
  { href: '/admin/recursos', label: 'Recursos' },
  { href: '/admin/libros', label: 'Libros' },
] as const

export default async function AdminLayout({ children }: LayoutProps<'/admin'>) {
  await requireAdmin()

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Administración</h1>
          <p className="text-xs text-muted">Solo visible para administradores</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/cuenta/email" className="text-sm text-muted underline hover:text-accent">
            Email
          </Link>
          <Link href="/cuenta/contrasena" className="text-sm text-muted underline hover:text-accent">
            Contraseña
          </Link>
          <form action={logout}>
            <button type="submit" className="btn-secondary">
              Salir
            </button>
          </form>
        </div>
      </div>

      <nav className="-mx-4 flex gap-1 overflow-x-auto border-b border-border px-4 text-sm sm:mx-0 sm:px-0">
        {NAV.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className="shrink-0 border-b-2 border-transparent px-3 py-2 text-muted hover:border-accent hover:text-foreground"
          >
            {n.label}
          </Link>
        ))}
      </nav>

      {children}
    </div>
  )
}
