import { OG_SIZE, imagenOg } from '@/lib/og'

export const alt = 'Confesor para sacerdotes: publica tus horarios de confesión y deja que los fieles reserven'
export const size = OG_SIZE
export const contentType = 'image/png'

export default function Image() {
  return imagenOg(
    'Que los fieles sepan cuándo confiesas',
    'Publica tu parroquia y tus horarios. Los fieles reservan sin registrarse y tú solo ves su nombre. Gratis.',
    'confesor.es/para-sacerdotes'
  )
}
