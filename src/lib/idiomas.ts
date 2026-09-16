// Idiomas ofrecidos en la app (códigos ISO 639-1). Se guardan como text[] en priests.languages.
export const IDIOMAS = [
  { code: 'es', nombre: 'Español' },
  { code: 'en', nombre: 'Inglés' },
  { code: 'fr', nombre: 'Francés' },
  { code: 'it', nombre: 'Italiano' },
  { code: 'pt', nombre: 'Portugués' },
  { code: 'de', nombre: 'Alemán' },
  { code: 'ca', nombre: 'Catalán' },
  { code: 'eu', nombre: 'Euskera' },
  { code: 'gl', nombre: 'Gallego' },
  { code: 'pl', nombre: 'Polaco' },
  { code: 'ro', nombre: 'Rumano' },
  { code: 'la', nombre: 'Latín' },
  { code: 'zh', nombre: 'Chino' },
  { code: 'tl', nombre: 'Tagalo' },
  { code: 'uk', nombre: 'Ucraniano' },
  { code: 'ar', nombre: 'Árabe' },
] as const

export type CodigoIdioma = (typeof IDIOMAS)[number]['code']

export function nombreIdioma(code: string) {
  return IDIOMAS.find((i) => i.code === code)?.nombre ?? code.toUpperCase()
}
