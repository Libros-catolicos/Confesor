import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cartelPdf } from '@/lib/cartel'
import { aSlug } from '@/lib/slug'
import { siteUrl } from '@/lib/site'

// Cartel en PDF del sacerdote que ha iniciado sesión: enlace, código QR y una
// frase para imprimir y colgar. Solo lleva datos públicos de su ficha.
export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new NextResponse('No autorizado', { status: 401 })

  const { data: priest } = await supabase
    .from('priests')
    .select('slug, display_name')
    .eq('id', user.id)
    .maybeSingle<{ slug: string; display_name: string }>()
  if (!priest) return new NextResponse('Sin ficha', { status: 404 })

  const { data: lugares } = await supabase
    .from('priest_places')
    .select('places(name, city)')
    .eq('priest_id', user.id)
    .returns<{ places: { name: string; city: string | null } | null }[]>()

  const sitios = (lugares ?? [])
    .map((l) => (l.places ? `${l.places.name}${l.places.city ? ` (${l.places.city})` : ''}` : null))
    .filter(Boolean) as string[]

  const pdf = await cartelPdf({
    nombre: priest.display_name,
    url: `${siteUrl()}/${priest.slug}`,
    lugar: sitios.length ? sitios.join(' · ') : null,
  })

  return new NextResponse(pdf as BodyInit, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="confesor-${aSlug(priest.display_name) || priest.slug}.pdf"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
