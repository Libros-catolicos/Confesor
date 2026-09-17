import Link from 'next/link'
import { requireAdmin } from '@/lib/admin'
import { nombreIdioma } from '@/lib/idiomas'
import { PRIEST_STATUS_LABEL, type Priest, type PriestStatus } from '@/lib/types'
import { cambiarEstadoSacerdote } from './actions'

export const metadata = { title: 'Sacerdotes' }

type Fila = Priest & {
  profiles: { email: string; full_name: string; created_at: string } | null
  priest_private: { verification_notes: string | null } | null
  priest_places: { places: { name: string; city: string | null } | null }[]
  availability_rules: { count: number }[]
}

const FILTROS: { id: PriestStatus | 'todos'; label: string }[] = [
  { id: 'pendiente', label: 'Pendientes' },
  { id: 'verificado', label: 'Verificados' },
  { id: 'rechazado', label: 'Rechazados' },
  { id: 'suspendido', label: 'Suspendidos' },
  { id: 'todos', label: 'Todos' },
]

const ESTILO: Record<PriestStatus, string> = {
  pendiente: 'bg-amber-50 text-amber-800',
  verificado: 'bg-green-50 text-green-800',
  rechazado: 'bg-red-50 text-red-800',
  suspendido: 'bg-border text-muted',
}

export default async function AdminSacerdotesPage({ searchParams }: PageProps<'/admin/sacerdotes'>) {
  const sp = await searchParams
  const estado = (typeof sp.estado === 'string' ? sp.estado : 'pendiente') as PriestStatus | 'todos'
  const { supabase } = await requireAdmin()

  let q = supabase
    .from('priests')
    .select(
      '*, profiles(email, full_name, created_at), priest_private(verification_notes), priest_places(places(name, city)), availability_rules(count)'
    )
    .order('created_at', { ascending: false })
  if (estado !== 'todos') q = q.eq('status', estado)
  const { data, error } = await q.returns<Fila[]>()
  if (error) console.error('[admin] sacerdotes:', error.message)
  const filas = data ?? []

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-1 text-sm">
        {FILTROS.map((f) => (
          <Link
            key={f.id}
            href={`/admin/sacerdotes?estado=${f.id}`}
            className={`rounded-lg px-3 py-1.5 ${estado === f.id ? 'bg-accent text-white' : 'text-muted hover:bg-accent-soft'}`}
          >
            {f.label}
          </Link>
        ))}
      </div>

      {filas.length === 0 ? (
        <p className="card text-sm text-muted">No hay sacerdotes en este estado.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {filas.map((p) => {
            const lugares = p.priest_places.map((pp) => pp.places).filter(Boolean)
            const reglas = p.availability_rules[0]?.count ?? 0
            return (
              <li key={p.id} className="card">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="text-sm">
                    <p className="text-base font-semibold">{p.display_name}</p>
                    <p className="text-muted">
                      {p.profiles?.email} · alta{' '}
                      {new Date(p.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    {p.diocese && <p className="mt-1">Diócesis: {p.diocese}</p>}
                    <p className="mt-1 text-muted">Idiomas: {p.languages.map(nombreIdioma).join(', ')}</p>
                    <p className="mt-1 text-muted">
                      {lugares.length === 0
                        ? 'Sin lugares'
                        : lugares.map((l) => `${l!.name}${l!.city ? ` (${l!.city})` : ''}`).join(' · ')}
                      {' · '}
                      {reglas} tramo{reglas === 1 ? '' : 's'} de horario
                    </p>
                    {p.bio && <p className="mt-2 italic text-muted">«{p.bio}»</p>}
                    <div className="mt-2 rounded-lg bg-accent-soft p-2">
                      <p className="text-xs font-medium text-accent">Datos de verificación</p>
                      <p className="whitespace-pre-line">
                        {p.priest_private?.verification_notes || <span className="text-muted">No ha indicado nada.</span>}
                      </p>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${ESTILO[p.status]}`}>
                    {PRIEST_STATUS_LABEL[p.status]}
                  </span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                  {p.status !== 'verificado' && (
                    <form action={cambiarEstadoSacerdote}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="status" value="verificado" />
                      <button type="submit" className="btn-primary">
                        Verificar
                      </button>
                    </form>
                  )}
                  {p.status === 'pendiente' && (
                    <form action={cambiarEstadoSacerdote}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="status" value="rechazado" />
                      <button type="submit" className="btn-secondary text-red-700">
                        Rechazar
                      </button>
                    </form>
                  )}
                  {p.status === 'verificado' && (
                    <form action={cambiarEstadoSacerdote}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="status" value="suspendido" />
                      <button type="submit" className="btn-secondary text-red-700">
                        Suspender
                      </button>
                    </form>
                  )}
                  {(p.status === 'rechazado' || p.status === 'suspendido') && (
                    <form action={cambiarEstadoSacerdote}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="status" value="pendiente" />
                      <button type="submit" className="btn-secondary">
                        Volver a pendiente
                      </button>
                    </form>
                  )}
                  {p.status === 'verificado' && (
                    <Link href={`/s/${p.slug}`} className="btn-secondary" target="_blank">
                      Ver ficha pública
                    </Link>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
