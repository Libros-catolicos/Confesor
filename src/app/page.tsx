import Link from 'next/link'
import { SearchForm } from '@/components/SearchForm'

export default function HomePage() {
  return (
    <div className="flex flex-col gap-10 py-6">
      <section className="text-center">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Encuentra un sacerdote cerca de ti
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-muted">
          Busca por ubicación, idioma y horario. Reserva una cita para confesarte o
          hablar, sin registrarte y sin dar más datos que un nombre y un contacto.
        </p>
      </section>

      <section className="card mx-auto w-full max-w-2xl">
        <SearchForm />
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[
          {
            t: '1. Busca',
            d: 'Indica dónde estás o deja que el navegador use tu ubicación. Filtra por idioma si lo necesitas.',
          },
          {
            t: '2. Elige un hueco',
            d: 'Verás los horarios libres de cada sacerdote en su parroquia, en la hora local del lugar.',
          },
          {
            t: '3. Reserva',
            d: 'Solo pedimos un nombre y un email o teléfono para confirmarte. Puedes cancelar desde el enlace que recibes.',
          },
        ].map((p) => (
          <div key={p.t} className="card">
            <h2 className="font-medium">{p.t}</h2>
            <p className="mt-1 text-sm text-muted">{p.d}</p>
          </div>
        ))}
      </section>

      <section className="rounded-xl bg-accent-soft p-6 text-center">
        <h2 className="font-semibold">¿Eres sacerdote?</h2>
        <p className="mt-1 text-sm text-muted">
          Publica tu parroquia, tus horarios de confesión y los idiomas en los que
          atiendes. Los fieles podrán reservar contigo.
        </p>
        <Link href="/registro" className="btn-primary mt-4">
          Crear mi ficha
        </Link>
      </section>
    </div>
  )
}
