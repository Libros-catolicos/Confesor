import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/app/(auth)/actions'
import { PRIEST_STATUS_LABEL, type Priest } from '@/lib/types'

const NAV = [
  { href: '/panel', label: 'Resumen' },
  { href: '/panel/citas', label: 'Citas' },
  { href: '/panel/horarios', label: 'Horarios' },
  { href: '/panel/lugares', label: 'Lugares' },
  { href: '/panel/ficha', label: 'Mi ficha' },
] as const

export default async function PanelLayout({ children }: LayoutProps<'/panel'>) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: priest, error } = await supabase
    .from('priests')
    .select('*')
    .eq('id', user.id)
    .single<Priest>()
  if (error) console.error('[panel] priests:', error.code, error.message)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{priest?.display_name ?? 'Mi panel'}</h1>
          {priest && (
            <span
              className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                priest.status === 'verificado'
                  ? 'bg-green-50 text-green-800'
                  : 'bg-amber-50 text-amber-800'
              }`}
            >
              {PRIEST_STATUS_LABEL[priest.status]}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
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

      {priest && priest.status === 'pendiente' && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          Tu ficha aún no es pública. Completa tus lugares y horarios y, en{' '}
          <Link href="/panel/ficha" className="underline">
            Mi ficha
          </Link>
          , indica cómo podemos verificar que eres sacerdote.
        </p>
      )}

      {children}
    </div>
  )
}
