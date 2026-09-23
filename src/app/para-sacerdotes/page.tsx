import Link from 'next/link'
import type { Metadata } from 'next'
import { BellRing, CalendarCheck, Clock, Eye, MapPin, QrCode, ShieldCheck } from 'lucide-react'

const DESCRIPCION =
  'Publica tus horarios de confesión y deja que los fieles reserven cita contigo. Descarga tu cartel con código QR para imprimirlo. Gratis, sin publicidad y sin que nadie vea tu contacto.'

export const metadata: Metadata = {
  title: 'Para sacerdotes',
  description: DESCRIPCION,
  alternates: { canonical: '/para-sacerdotes' },
  openGraph: { title: 'Confesor para sacerdotes', description: DESCRIPCION, url: '/para-sacerdotes' },
}

const PASOS = [
  {
    t: '1. Crea tu ficha',
    d: 'Nombre, diócesis, idiomas en los que atiendes y una breve presentación. Tu correo de acceso no se publica.',
  },
  {
    t: '2. Añade tu parroquia y tus horarios',
    d: 'Una o varias parroquias con su dirección y, para cada una, los tramos semanales en que confiesas o atiendes conversaciones. Puedes marcar ausencias.',
  },
  {
    t: '3. Te verificamos',
    d: 'Indícanos la parroquia donde estás destinado y un contacto institucional donde podamos comprobarlo. Un administrador lo revisa y activa tu ficha. Así nadie puede suplantar a un sacerdote.',
  },
  {
    t: '4. Los fieles reservan',
    d: 'Te avisamos por correo de cada cita con dos botones: Confirmar o Rechazar. Si lo prefieres, la confirmación puede ser automática.',
  },
  {
    t: '5. Cuelga tu cartel',
    d: 'Desde tu ficha descargas un cartel A4 en PDF con tu código QR y tu enlace, listo para imprimir y colgar en la puerta de la iglesia o del confesionario.',
  },
]

const VENTAJAS = [
  {
    Icon: Eye,
    t: 'Solo ves el nombre del fiel',
    d: 'Nunca su correo ni ningún otro dato. Confesor se encarga de avisarle de lo que hagas con la cita. No hay chat ni mensajes.',
  },
  {
    Icon: ShieldCheck,
    t: 'Tu contacto tampoco se publica',
    d: 'Los fieles reservan un hueco; no reciben tu correo ni tu teléfono. Tú decides qué poner en tu presentación pública.',
  },
  {
    Icon: Clock,
    t: 'Tú controlas la agenda',
    d: 'Antelación mínima para reservar, duración de los huecos, ausencias y cancelación proponiendo otra hora. El fiel puede aceptar o reservar otra.',
  },
  {
    Icon: CalendarCheck,
    t: 'Tus citas en tu calendario',
    d: 'Un enlace privado añade tus citas a Google Calendar, Apple Calendar u Outlook, sin instalar nada.',
  },
  {
    Icon: BellRing,
    t: '«Ya estoy aquí»',
    d: 'Cuando el fiel llega a la parroquia puede pulsar un botón y recibes un correo al instante. Útil si estás en la sacristía o en el despacho.',
  },
  {
    Icon: QrCode,
    t: 'Tu cartel con código QR',
    d: 'Un PDF A4 listo para imprimir: «Reserva un rato para confesarte con…», tu código QR y tu enlace. Quien lo escanee ve tus horarios y reserva en el momento.',
  },
  {
    Icon: MapPin,
    t: 'Te encuentran cerca',
    d: 'Quien busque un sacerdote por su ubicación, idioma u horario verá tu parroquia y tus próximos huecos libres.',
  },
]

const PREGUNTAS = [
  {
    q: '¿Cuánto cuesta?',
    a: 'Nada. Confesor es gratuito para sacerdotes y fieles, no tiene publicidad y no vende datos. Lo mantiene un editor de libros católicos como servicio a la Iglesia.',
  },
  {
    q: '¿Qué pasa con la confesión de los fieles?',
    a: 'Nada se confiesa por la aplicación ni se pregunta nunca el motivo de la cita. Confesor solo concierta la hora; el sacramento se celebra en persona, como siempre.',
  },
  {
    q: '¿Y si no puedo atender una cita?',
    a: 'Puedes cancelarla o proponer otra hora desde tu panel. El fiel recibe el aviso por correo y puede aceptar la propuesta o reservar otro hueco. Todo sin que te vea el contacto.',
  },
  {
    q: '¿Cuánto tiempo se guardan las citas?',
    a: 'Cada reserva se borra 7 días después de la fecha de la cita. Tu panel solo muestra citas recientes; no hay historial de fieles.',
  },
  {
    q: '¿Puedo atender en varias parroquias o en varios idiomas?',
    a: 'Sí. Cada parroquia tiene su propia dirección y horarios, y puedes indicar todos los idiomas en los que confiesas.',
  },
  {
    q: '¿Necesito permiso de mi diócesis?',
    a: 'Confesor no sustituye las normas de tu diócesis ni de tu superior. Te pedimos que cuentes con los permisos que ellos exijan y que tengas las licencias en vigor.',
  },
]

export default function ParaSacerdotesPage() {
  return (
    <div className="flex flex-col gap-12 py-6">
      <section className="text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-accent">Para sacerdotes</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          Que los fieles sepan cuándo confiesas y puedan reservar
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-muted">
          Publica tu parroquia, tus horarios y tus idiomas. Los fieles te encuentran cerca de ellos y
          reservan un hueco sin necesidad de registrarse. Tú solo ves su nombre. Y puedes descargar un
          cartel con tu código QR para imprimirlo y colgarlo en la iglesia. Es gratis y sin publicidad.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/registro/sacerdote" className="btn-primary">
            Crear mi ficha
          </Link>
          <Link href="/buscar" className="btn-secondary">
            Ver cómo lo ven los fieles
          </Link>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Cómo funciona</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {PASOS.map((p) => (
            <div key={p.t} className="card">
              <h3 className="font-medium">{p.t}</h3>
              <p className="mt-1 text-sm text-muted">{p.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Pensado para el ministerio</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {VENTAJAS.map((v) => (
            <div key={v.t} className="card">
              <v.Icon className="h-5 w-5 text-accent" aria-hidden />
              <h3 className="mt-2 font-medium">{v.t}</h3>
              <p className="mt-1 text-sm text-muted">{v.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Preguntas frecuentes</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          {PREGUNTAS.map((p) => (
            <div key={p.q} className="card">
              <dt className="font-medium">{p.q}</dt>
              <dd className="mt-1 text-sm text-muted">{p.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="rounded-xl bg-accent-soft p-8 text-center">
        <h2 className="text-xl font-semibold">Crea tu ficha en cinco minutos</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm text-muted">
          Solo necesitas tu nombre, un correo y los horarios en que confiesas. La ficha se publica
          cuando la verifiquemos.
        </p>
        <Link href="/registro/sacerdote" className="btn-primary mt-5">
          Crear mi ficha
        </Link>
        <p className="mt-4 text-xs text-muted">
          ¿Dudas? Escríbenos desde la{' '}
          <Link href="/contacto" className="underline">
            página de contacto
          </Link>
          .
        </p>
      </section>
    </div>
  )
}
