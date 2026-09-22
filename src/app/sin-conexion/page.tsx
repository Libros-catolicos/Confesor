import { WifiOff } from 'lucide-react'
import { Reintentar } from './Reintentar'

export const metadata = { title: 'Sin conexión' }

// Se muestra cuando el dispositivo no tiene red (la sirve el service worker).
export default function SinConexionPage() {
  return (
    <div className="mx-auto w-full max-w-md py-12 text-center">
      <WifiOff className="mx-auto h-10 w-10 text-muted" aria-hidden />
      <h1 className="mt-4 text-2xl font-semibold">Sin conexión</h1>
      <p className="mt-3 text-muted">
        No hemos podido conectar. Confesor necesita internet para mostrar los horarios y reservar,
        porque no guardamos tus citas en el teléfono.
      </p>
      <Reintentar />
      <p className="mt-6 text-sm text-muted">
        Si ya habías reservado, tu cita sigue en pie aunque no puedas verla ahora.
      </p>
    </div>
  )
}
