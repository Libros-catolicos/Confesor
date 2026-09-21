import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ContrasenaForm } from './ContrasenaForm'

export const metadata = { title: 'Cambiar contraseña' }

export default async function ContrasenaPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/cuenta/contrasena')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
  const volver = profile?.role === 'admin' ? '/admin' : '/panel'

  return (
    <div className="mx-auto w-full max-w-sm py-8">
      <h1 className="text-2xl font-semibold">Cambiar contraseña</h1>
      <p className="mt-1 text-sm text-muted">Cuenta: {user.email}</p>
      <div className="card mt-6">
        <ContrasenaForm volver={volver} />
      </div>
      <p className="mt-4 text-center text-sm text-muted">
        <Link href={volver} className="text-accent underline">
          Volver
        </Link>
      </p>
    </div>
  )
}
