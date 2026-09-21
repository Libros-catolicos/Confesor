import Link from 'next/link'
import { RecuperarForm } from './RecuperarForm'

export const metadata = { title: 'Recuperar contraseña' }

export default function RecuperarPage() {
  return (
    <div className="mx-auto w-full max-w-sm py-8">
      <h1 className="text-2xl font-semibold">Recuperar contraseña</h1>
      <p className="mt-1 text-sm text-muted">
        Escribe el email con el que te registraste y te enviaremos un enlace para crear una contraseña nueva.
      </p>
      <div className="card mt-6">
        <RecuperarForm />
      </div>
      <p className="mt-4 text-center text-sm text-muted">
        <Link href="/login" className="text-accent underline">
          Volver a entrar
        </Link>
      </p>
    </div>
  )
}
