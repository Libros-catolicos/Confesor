import Link from 'next/link'
import { Church, User } from 'lucide-react'

export const metadata = { title: 'Crear cuenta' }

export default function RegistroPage() {
  return (
    <div className="mx-auto w-full max-w-lg py-8">
      <h1 className="text-2xl font-semibold">Crear cuenta</h1>
      <p className="mt-1 text-sm text-muted">
        Para reservar una cita <strong>no hace falta cuenta</strong>. Crea una si quieres algo más.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link href="/registro/fiel" className="card flex flex-col gap-2 transition-shadow hover:shadow-md">
          <User className="h-6 w-6 text-accent" aria-hidden />
          <h2 className="font-semibold">Quiero llevar mi registro</h2>
          <p className="text-sm text-muted">
            Guarda tus citas, apunta cuándo te confesaste por última vez y recibe avisos si lo deseas.
          </p>
        </Link>
        <Link href="/registro/sacerdote" className="card flex flex-col gap-2 transition-shadow hover:shadow-md">
          <Church className="h-6 w-6 text-accent" aria-hidden />
          <h2 className="font-semibold">Soy sacerdote</h2>
          <p className="text-sm text-muted">
            Publica tu parroquia, horarios e idiomas para que los fieles reserven contigo.
          </p>
        </Link>
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
