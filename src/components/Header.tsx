import Link from 'next/link'
import { Cross } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

export async function Header() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex h-14 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold text-accent">
          <Cross className="h-5 w-5" aria-hidden />
          Confesor
        </Link>
        <nav className="flex items-center gap-2 text-sm">
          <Link href="/buscar" className="btn-secondary">
            Buscar sacerdote
          </Link>
          {user ? (
            <Link href="/panel" className="btn-primary">
              Mi panel
            </Link>
          ) : (
            <Link href="/login" className="btn-primary">
              Soy sacerdote
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
