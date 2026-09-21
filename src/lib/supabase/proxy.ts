import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Rutas que exigen sesión de sacerdote/admin. Todo lo demás es público:
// los fieles buscan y reservan sin cuenta.
const RUTAS_PRIVADAS = ['/panel', '/admin', '/cuenta', '/mi-cuenta']

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANTE: no poner lógica entre createServerClient y getUser()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl
  const esPrivada = RUTAS_PRIVADAS.some((r) => pathname.startsWith(r))

  if (!user && esPrivada) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  if (user && (pathname === '/login' || pathname.startsWith('/registro'))) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
    const url = request.nextUrl.clone()
    url.pathname = profile?.role === 'admin' ? '/admin' : profile?.role === 'fiel' ? '/mi-cuenta' : '/panel'
    url.search = ''
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
