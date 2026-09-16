import Link from 'next/link'
import { LoginForm } from './LoginForm'

export const metadata = { title: 'Acceso sacerdotes' }

export default async function LoginPage({ searchParams }: PageProps<'/login'>) {
  const sp = await searchParams
  const next = typeof sp.next === 'string' ? sp.next : '/panel'

  return (
    <div className="mx-auto w-full max-w-sm py-8">
      <h1 className="text-2xl font-semibold">Acceso para sacerdotes</h1>
      <p className="mt-1 text-sm text-muted">
        Los fieles no necesitan cuenta: pueden{' '}
        <Link href="/buscar" className="text-accent underline">
          buscar y reservar directamente
        </Link>
        .
      </p>

      <div className="card mt-6">
        <LoginForm next={next} />
      </div>

      <p className="mt-4 text-center text-sm text-muted">
        ¿Aún no tienes ficha?{' '}
        <Link href="/registro" className="text-accent underline">
          Regístrate
        </Link>
      </p>
    </div>
  )
}
