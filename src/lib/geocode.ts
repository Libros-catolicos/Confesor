// Geocodificación con Photon (komoot, datos OpenStreetMap). Gratis, sin clave,
// tolera bien las direcciones en español y reconoce parroquias por su nombre.
// Nominatim queda como respaldo. Si el proyecto crece: Google Geocoding o Mapbox.

export interface GeoResult {
  lat: number
  lng: number
  label: string
}

const UA = 'Confesor/0.1 (contacto: ignacio@roaruiz.com)'
const CACHE = { next: { revalidate: 60 * 60 * 24 * 30 } } // misma consulta → mismo sitio; cachear un mes

interface PhotonFeature {
  geometry: { coordinates: [number, number] }
  properties: {
    name?: string
    street?: string
    housenumber?: string
    postcode?: string
    city?: string
    town?: string
    village?: string
    county?: string
    state?: string
    country?: string
    osm_key?: string
    osm_value?: string
  }
}

function etiqueta(p: PhotonFeature['properties']) {
  const via = [p.street, p.housenumber].filter(Boolean).join(' ')
  const localidad = p.city ?? p.town ?? p.village ?? p.county
  const partes = [p.name, via, [p.postcode, localidad].filter(Boolean).join(' '), p.state, p.country]
  // Sin repetir cuando name coincide con la vía o la localidad
  return Array.from(new Set(partes.filter(Boolean) as string[])).join(', ')
}

async function photon(q: string, limit: number): Promise<GeoResult[]> {
  const url = new URL('https://photon.komoot.io/api/')
  url.searchParams.set('q', q)
  url.searchParams.set('limit', String(limit))
  const res = await fetch(url, { headers: { 'User-Agent': UA }, ...CACHE })
  if (!res.ok) return []
  const data = (await res.json()) as { features?: PhotonFeature[] }
  return (data.features ?? []).map((f) => ({
    lng: f.geometry.coordinates[0],
    lat: f.geometry.coordinates[1],
    label: etiqueta(f.properties),
  }))
}

async function nominatim(q: string, limit: number): Promise<GeoResult[]> {
  const url = new URL('https://nominatim.openstreetmap.org/search')
  url.searchParams.set('q', q)
  url.searchParams.set('format', 'jsonv2')
  url.searchParams.set('limit', String(limit))
  url.searchParams.set('accept-language', 'es')
  const res = await fetch(url, { headers: { 'User-Agent': UA }, ...CACHE })
  if (!res.ok) return []
  const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>
  return data.map((d) => ({ lat: parseFloat(d.lat), lng: parseFloat(d.lon), label: d.display_name }))
}

/** Varios candidatos, para que el usuario elija el correcto */
export async function geocodeCandidates(q: string, limit = 5): Promise<GeoResult[]> {
  const r = await photon(q, limit)
  if (r.length) return r
  return nominatim(q, limit)
}

/** Mejor candidato (búsqueda de fieles) */
export async function geocode(q: string): Promise<GeoResult | null> {
  const r = await geocodeCandidates(q, 1)
  return r[0] ?? null
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const url = new URL('https://photon.komoot.io/reverse')
  url.searchParams.set('lat', String(lat))
  url.searchParams.set('lon', String(lng))
  url.searchParams.set('limit', '1')
  const res = await fetch(url, { headers: { 'User-Agent': UA }, ...CACHE })
  if (!res.ok) return null
  const data = (await res.json()) as { features?: PhotonFeature[] }
  const p = data.features?.[0]?.properties
  if (!p) return null
  const localidad = p.city ?? p.town ?? p.village ?? p.county ?? null
  return [p.street, localidad].filter(Boolean).join(', ') || localidad
}
