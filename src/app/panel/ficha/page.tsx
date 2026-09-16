import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Priest, PriestPrivate } from '@/lib/types'
import { siteUrl } from '@/lib/site'
import { FichaForm } from './FichaForm'
import { CopiarEnlace } from './CopiarEnlace'

export const metadata = { title: 'Mi ficha' }

export default async function FichaPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [{ data: priest }, { data: priv }] = await Promise.all([
    supabase.from('priests').select('*').eq('id', user!.id).single<Priest>(),
    supabase.from('priest_private').select('*').eq('priest_id', user!.id).single<PriestPrivate>(),
  ])
  if (!priest || !priv) return null

  const base = siteUrl()
  const urlPublica = `${base}/s/${priest.slug}`
  const urlCalendario = `${base}/api/calendario/${priv.calendar_token}.ics`

  return (
    <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
      <section className="card">
        <h2 className="font-semibold">Datos públicos y ajustes</h2>
        <FichaForm priest={priest} verificationNotes={priv.verification_notes} />
      </section>

      <div className="flex flex-col gap-4">
        <section className="card">
          <h2 className="font-semibold">Tu página pública</h2>
          <p className="mt-1 text-sm text-muted">
            Compártela en el boletín, en la puerta de la iglesia o en redes. Los fieles reservan desde ahí.
          </p>
          <CopiarEnlace url={urlPublica} />
          {priest.status !== 'verificado' && (
            <p className="mt-2 text-xs text-amber-800">
              Solo será visible cuando tu ficha esté verificada.
            </p>
          )}
          {priest.status === 'verificado' && (
            <Link href={`/s/${priest.slug}`} className="mt-2 inline-block text-sm text-accent underline" target="_blank">
              Ver como la ven los fieles
            </Link>
          )}
        </section>

        <section className="card">
          <h2 className="font-semibold">Tu calendario personal</h2>
          <p className="mt-1 text-sm text-muted">
            Suscríbete a este enlace desde Google Calendar, Apple Calendar u Outlook y las citas
            aparecerán y se actualizarán solas. Es privado: no lo compartas.
          </p>
          <CopiarEnlace url={urlCalendario} />
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer text-accent">Cómo añadirlo</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
              <li>
                <span className="text-foreground">Google Calendar</span> (en el ordenador): Otros calendarios → + →
                «Desde una URL» → pega el enlace.
              </li>
              <li>
                <span className="text-foreground">iPhone / Mac</span>: Ajustes → Calendario → Cuentas → Añadir →
                Otra → «Añadir calendario suscrito».
              </li>
              <li>
                <span className="text-foreground">Outlook</span>: Añadir calendario → Suscribirse desde la web.
              </li>
            </ul>
            <p className="mt-2 text-xs text-muted">
              Los calendarios refrescan las suscripciones cada pocas horas; las citas nuevas pueden tardar en aparecer.
            </p>
          </details>
        </section>
      </div>
    </div>
  )
}
