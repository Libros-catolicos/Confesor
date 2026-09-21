import { ContactoForm } from './ContactoForm'

export const metadata = { title: 'Contacto' }

export default function ContactoPage() {
  return (
    <div className="mx-auto w-full max-w-md py-8">
      <h1 className="text-2xl font-semibold">Contacto</h1>
      <p className="mt-1 text-sm text-muted">
        Escríbenos por aquí o directamente a{' '}
        <a href="mailto:info@confesor.es" className="text-accent underline">
          info@confesor.es
        </a>
        . También es el canal para ejercer tus derechos sobre tus datos o comunicar un contenido que
        consideres ilícito.
      </p>
      <div className="card mt-6">
        <ContactoForm />
      </div>
    </div>
  )
}
