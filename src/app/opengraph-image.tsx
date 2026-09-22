import { OG_SIZE, imagenOg } from '@/lib/og'

export const alt = 'Confesor: encuentra un sacerdote cerca de ti y reserva cita para confesarte'
export const size = OG_SIZE
export const contentType = 'image/png'

export default function Image() {
  return imagenOg(
    'Encuentra un sacerdote cerca de ti',
    'Busca por ubicación, idioma y horario. Reserva cita para confesarte sin registrarte.'
  )
}
