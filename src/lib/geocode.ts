// Geocodificación con Nominatim (OpenStreetMap). Gratis, sin clave.
// Política de uso: máx. 1 petición/segundo y User-Agent identificable.
// Si el proyecto crece, sustituir por Google Geocoding o Mapbox.

export interface GeoResult {
  lat: number
  lng: number
  label: string
}

const UA = 'Confesor/0.1 (contacto: ignacio@roaruiz.com)'

export async function geocode(q: string): Promise<GeoResult | null> {
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', q)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('limit', '1')
  url.searchParams.set('accept-language', 'es')

  const res = await fetch(url, {
    headers: { 'User-Agent': UA },
    next: { revalidate: 60 * 60 * 24 * 30 }, // misma consulta → mismo sitio; cachear un mes
  })
  if (!res.ok) return null
  const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>
  if (!data.length) return null
  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    label: data[0].display_name,
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const url = new URL('https://nominatim.openstreetmap.org/reverse')
  url.searchParams.set('lat', String(lat))
  url.searchParams.set('lon', String(lng))
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('zoom', '14')
  url.searchParams.set('accept-language', 'es')

  const res = await fetch(url, {
    headers: { 'User-Agent': UA },
    next: { revalidate: 60 * 60 * 24 * 30 },
  })
  if (!res.ok) return null
  const data = (await res.json()) as { address?: Record<string, string> }
  const a = data.address ?? {}
  return a.city ?? a.town ?? a.village ?? a.municipality ?? a.county ?? null
}
