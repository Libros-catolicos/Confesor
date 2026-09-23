// El enlace público de cada sacerdote cuelga de la raíz (confesor.es/juan-perez),
// así que ningún sacerdote puede ocupar una ruta de la aplicación. Esta lista es
// la única fuente de verdad: se comprueba al registrar, al cambiar el enlace y al
// servir la página. Al crear una ruta nueva de primer nivel hay que añadirla aquí.
export const RUTAS_RESERVADAS = new Set([
  'admin',
  'api',
  'auth',
  'aviso-legal',
  'baja',
  'buscar',
  'cita',
  'condiciones',
  'contacto',
  'cuenta',
  'login',
  'manifest.webmanifest',
  'mi-cuenta',
  'panel',
  'para-sacerdotes',
  'privacidad',
  'recuperar',
  'recursos',
  'registro',
  's',
  'sin-conexion',
  // Nombres que podríamos necesitar más adelante o que confunden
  'app',
  'ayuda',
  'blog',
  'confesor',
  'donar',
  'favicon.ico',
  'iglesia',
  'index',
  'noticias',
  'opengraph-image',
  'parroquia',
  'prensa',
  'robots.txt',
  'sacerdote',
  'sacerdotes',
  'sitemap.xml',
  'sw.js',
  'www',
])

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Pasa un nombre a un enlace legible: «P. Juan Pérez» → «juan-perez» */
export function aSlug(texto: string) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '')
}

/** Motivo por el que un enlace no vale, o null si es correcto */
export function motivoSlugInvalido(slug: string): string | null {
  if (slug.length < 3) return 'El enlace es demasiado corto.'
  if (slug.length > 40) return 'El enlace no puede superar los 40 caracteres.'
  if (!SLUG_RE.test(slug)) return 'Usa solo minúsculas, números y guiones (por ejemplo: p-juan-perez).'
  if (RUTAS_RESERVADAS.has(slug)) return 'Ese enlace está reservado por la aplicación. Elige otro.'
  return null
}
