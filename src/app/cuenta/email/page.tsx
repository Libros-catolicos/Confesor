import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { homeForRole, type UserRole } from '@/lib/types'
import { EmailForm } from './EmailForm'

export const metadata = { title: 'Cambiar email' }

export default async function EmailPage({ searchParams }: PageProps<'/cuenta/email'>) {
  const sp = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/cuenta/email')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const volver = homeForRole(profile?.role as UserRole | undefined)

  return (
    <div className="mx-auto w-full max-w-sm py-8">
      <h1 className="text-2xl font-semibold">Cambiar email</h1>
      <p className="mt-1 text-sm text-muted">Email actual: {user.email}</p>
      {sp.ok === '1' && (
        <p className="mt-3 rounded-lg bg-green-50 p-3 text-sm text-green-800">Email confirmado y actualizado.</p>
      )}
      <div className="card mt-6">
        <EmailForm />
      </div>
      <p className="mt-4 text-center text-sm text-muted">
        <Link href={volver} className="text-accent underline">
          Volver
        </Link>
      </p>
    </div>
  )
}
