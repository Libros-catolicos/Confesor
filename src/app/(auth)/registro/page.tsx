import Link from 'next/link'
import { RegistroForm } from './RegistroForm'

export const metadata = { title: 'Registro de sacerdotes' }

export default function RegistroPage() {
  return (
    <div className="mx-auto w-full max-w-md py-8">
      <h1 className="text-2xl font-semibold">Crear mi ficha de sacerdote</h1>
      <p className="mt-1 text-sm text-muted">
        Tras registrarte podrás añadir tu parroquia y horarios. Tu ficha se hará pública
        cuando verifiquemos que eres sacerdote; te pediremos algún dato de contacto de tu
        diócesis o parroquia.
      </p>

      <div className="card mt-6">
        <RegistroForm />
      </div>

      <p className="mt-4 text-center text-sm text-muted">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="text-accent underline">
          Entrar
        </Link>
      </p>
    </div>
  )
}
