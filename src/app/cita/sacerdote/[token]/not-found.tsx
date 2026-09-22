import Link from 'next/link'

// Enlace de cita inexistente o caducado: las reservas se borran 7 días
// después de la cita y con ellas dejan de funcionar sus enlaces.
export default function CitaNoEncontrada() {
  return (
    <div className="mx-auto w-full max-w-lg py-10 text-center">
      <h1 className="text-2xl font-semibold">Este enlace ya no es válido</h1>
      <p className="mt-3 text-muted">
        La cita no existe o ya ha pasado. Por privacidad, borramos cada reserva 7 días después de
        la fecha de la cita, y con ella dejan de funcionar sus enlaces.
      </p>
      <Link href="/panel/citas" className="btn-primary mt-6">
        Ver mis citas
      </Link>
    </div>
  )
}
