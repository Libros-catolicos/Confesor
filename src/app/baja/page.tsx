import Link from 'next/link'
import { bajaNewsletterPorToken } from '@/lib/consentimiento'

export const metadata = { title: 'Baja de la lista' }

// Baja en un clic desde el enlace del correo, sin iniciar sesión.
export default async function BajaPage({ searchParams }: PageProps<'/baja'>) {
  const sp = await searchParams
  const token = typeof sp.token === 'string' ? sp.token : ''
  const ok = /^[A-Za-z0-9_-]{20,}$/.test(token) ? await bajaNewsletterPorToken(token) : false

  return (
    <div className="mx-auto w-full max-w-md py-10 text-center">
      <h1 className="text-2xl font-semibold">{ok ? 'Baja completada' : 'Enlace no válido'}</h1>
      <p className="mt-2 text-sm text-muted">
        {ok
          ? 'Ya no recibirás recomendaciones de libros por correo. Tu dirección se ha eliminado de la lista.'
          : 'Este enlace de baja ya se ha usado o no es correcto. Si sigues recibiendo correos, escríbenos a info@confesor.es.'}
      </p>
      <Link href="/" className="btn-secondary mt-6">
        Volver a Confesor
      </Link>
    </div>
  )
}
