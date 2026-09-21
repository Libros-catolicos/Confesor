import Link from 'next/link'
import { BookOpen, Cross, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { homeForRole, type UserRole } from '@/lib/types'

const ENLACES = [
  { href: '/buscar', label: 'Buscar sacerdote', Icon: Search },
  { href: '/recursos', label: 'Recursos', Icon: BookOpen },
] as const

export async function Header() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: profile } = user
    ? await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    : { data: null }
  const role = profile?.role as UserRole | undefined
  const etiqueta = role === 'admin' ? 'Administración' : role === 'fiel' ? 'Mi cuenta' : 'Mi panel'

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2 font-semibold text-accent">
          <Cross className="h-5 w-5" aria-hidden />
          Confesor
        </Link>
        <nav className="flex items-center gap-1 text-sm sm:gap-2">
          {/* En escritorio, enlaces en línea; en móvil van en la fila inferior */}
          {ENLACES.map((e) => (
            <Link
              key={e.href}
              href={e.href}
              className="hidden rounded-lg px-3 py-2 text-foreground hover:bg-accent-soft sm:inline-flex"
            >
              {e.label}
            </Link>
          ))}
          {user ? (
            <Link href={homeForRole(role)} className="btn-primary">
              {etiqueta}
            </Link>
          ) : (
            <Link href="/login" className="btn-primary">
              Entrar
            </Link>
          )}
        </nav>
      </div>

      <nav className="flex border-t border-border text-sm sm:hidden">
        {ENLACES.map((e) => (
          <Link
            key={e.href}
            href={e.href}
            className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-foreground hover:bg-accent-soft"
          >
            <e.Icon className="h-4 w-4 text-muted" aria-hidden />
            {e.label}
          </Link>
        ))}
      </nav>
    </header>
  )
}
