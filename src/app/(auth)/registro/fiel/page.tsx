import Link from 'next/link'
import { RegistroFielForm } from './RegistroFielForm'

export const metadata = { title: 'Crear cuenta' }

export default function RegistroFielPage() {
  return (
    <div className="mx-auto w-full max-w-md py-8">
      <h1 className="text-2xl font-semibold">Crear mi cuenta</h1>
      <p className="mt-1 text-sm text-muted">
        Con una cuenta puedes ver tus citas, llevar la cuenta de cuándo te confesaste por última vez
        y recibir avisos. Solo guardamos tu nombre, tu email y las fechas.
      </p>

      <div className="card mt-6">
        <RegistroFielForm />
      </div>

      <p className="mt-4 text-center text-sm text-muted">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="text-accent underline">
          Entrar
        </Link>
        {' · '}
        <Link href="/registro/sacerdote" className="text-accent underline">
          Soy sacerdote
        </Link>
      </p>
    </div>
  )
}
