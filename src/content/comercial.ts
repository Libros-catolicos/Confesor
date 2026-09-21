// Bloque comercial de los correos (documento legal, B5). Solo se incluye si el
// destinatario está suscrito a la lista. Mientras haya [PENDIENTE] no se envía.

export const BLOQUE_COMERCIAL = {
  libroTitulo: '[PENDIENTE: título]',
  libroAutor: '[PENDIENTE: autor]',
  libroUrl: '[PENDIENTE: enlace]',
  ebookTitulo: '[PENDIENTE: título del ebook]',
  ebookAutor: 'san Alfonso María de Ligorio',
  ebookUrl: '[PENDIENTE: enlace de descarga]',
} as const

export const BLOQUE_COMERCIAL_ACTIVO = !Object.values(BLOQUE_COMERCIAL).some((v) => v.includes('[PENDIENTE'))
