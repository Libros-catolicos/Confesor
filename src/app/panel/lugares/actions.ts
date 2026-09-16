'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { geocodeCandidates, type GeoResult } from '@/lib/geocode'
import { TIMEZONES } from '@/lib/types'

export type LugarState =
  | {
      paso: 'buscar'
      error?: string
    }
  | {
      paso: 'elegir'
      candidatos: GeoResult[]
      valores: { name: string; address: string; city: string; timezone: string }
      error?: string
    }
  | { paso: 'hecho'; ok: string }

/** Paso 1: localizar la dirección y devolver candidatos */
async function buscarDireccion(_prev: LugarState, formData: FormData): Promise<LugarState> {
  const valores = {
    name: String(formData.get('name') ?? '').trim(),
    address: String(formData.get('address') ?? '').trim(),
    city: String(formData.get('city') ?? '').trim(),
    timezone: String(formData.get('timezone') ?? 'Europe/Madrid'),
  }

  if (valores.name.length < 3) return { paso: 'buscar', error: 'Indica el nombre de la parroquia o centro.' }
  if (valores.address.length < 5) return { paso: 'buscar', error: 'Indica la dirección.' }
  if (!TIMEZONES.some((t) => t.value === valores.timezone)) return { paso: 'buscar', error: 'Zona horaria no válida.' }

  const sufijo = valores.city ? `, ${valores.city}` : ''
  const [porDireccion, porNombre] = await Promise.all([
    geocodeCandidates(`${valores.address}${sufijo}`, 4),
    geocodeCandidates(`${valores.name}${sufijo}`, 3),
  ])
  // Unir sin duplicar puntos casi iguales
  const candidatos: GeoResult[] = []
  for (const c of [...porDireccion, ...porNombre]) {
    if (!candidatos.some((x) => Math.abs(x.lat - c.lat) < 0.0005 && Math.abs(x.lng - c.lng) < 0.0005)) {
      candidatos.push(c)
    }
  }

  if (candidatos.length === 0) {
    return {
      paso: 'buscar',
      error: 'No hemos encontrado esa dirección. Prueba a escribirla más completa o con la ciudad.',
    }
  }
  return { paso: 'elegir', candidatos: candidatos.slice(0, 6), valores }
}

/** Paso 2: guardar el lugar con el punto elegido */
async function crearLugar(prev: LugarState, formData: FormData): Promise<LugarState> {
  if (prev.paso !== 'elegir') return { paso: 'buscar', error: 'Vuelve a buscar la dirección.' }

  const idx = Number(formData.get('candidato'))
  const elegido = prev.candidatos[idx]
  if (!elegido) return { ...prev, error: 'Elige una de las ubicaciones.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { paso: 'buscar', error: 'Sesión caducada.' }

  const { name, address, city, timezone } = prev.valores
  const { data: place, error } = await supabase
    .from('places')
    .insert({
      name,
      address,
      city: city || null,
      location: `SRID=4326;POINT(${elegido.lng} ${elegido.lat})`,
      timezone,
      created_by: user.id,
    })
    .select('id')
    .single()
  if (error || !place) {
    console.error('[lugares] insert:', error?.message)
    return { ...prev, error: 'No se ha podido guardar el lugar.' }
  }

  const { error: e2 } = await supabase.from('priest_places').insert({ priest_id: user.id, place_id: place.id })
  if (e2) {
    console.error('[lugares] vincular:', e2.message)
    return { ...prev, error: 'Lugar creado pero no se ha podido vincular a tu ficha.' }
  }

  revalidatePath('/panel')
  return { paso: 'hecho', ok: `Lugar añadido: ${name}.` }
}

/** Un solo action para useActionState; el campo oculto "accion" decide el paso */
export async function lugarAction(prev: LugarState, formData: FormData): Promise<LugarState> {
  const accion = String(formData.get('accion') ?? 'buscar')
  if (accion === 'crear') return crearLugar(prev, formData)
  if (accion === 'volver') return { paso: 'buscar' }
  return buscarDireccion(prev, formData)
}

export async function quitarLugar(formData: FormData) {
  const placeId = String(formData.get('place_id') ?? '')
  if (!placeId) return

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  // Quita el vínculo; si el lugar lo creó este sacerdote y nadie más lo usa, se borra.
  await supabase.from('priest_places').delete().eq('priest_id', user.id).eq('place_id', placeId)
  const { count } = await supabase
    .from('priest_places')
    .select('*', { count: 'exact', head: true })
    .eq('place_id', placeId)
  if (count === 0) {
    await supabase.from('places').delete().eq('id', placeId).eq('created_by', user.id)
  }

  revalidatePath('/panel')
}
