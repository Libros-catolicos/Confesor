'use client'

import { useActionState } from 'react'
import { IDIOMAS } from '@/lib/idiomas'
import { MIN_NOTICE_OPTIONS, type Priest } from '@/lib/types'
import { guardarFicha } from './actions'

export function FichaForm({
  priest,
  verificationNotes,
}: {
  priest: Priest
  verificationNotes: string | null
}) {
  const [state, action, pending] = useActionState(guardarFicha, undefined)

  return (
    <form action={action} className="mt-4 flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="display_name" className="label">
            Nombre público
          </label>
          <input
            id="display_name"
            name="display_name"
            required
            defaultValue={priest.display_name}
            placeholder="P. Juan Pérez"
            className="input"
          />
        </div>
        <div>
          <label htmlFor="diocese" className="label">
            Diócesis
          </label>
          <input id="diocese" name="diocese" defaultValue={priest.diocese ?? ''} placeholder="Madrid" className="input" />
        </div>
      </div>

      <div>
        <label htmlFor="bio" className="label">
          Presentación breve
        </label>
        <textarea
          id="bio"
          name="bio"
          rows={3}
          maxLength={600}
          defaultValue={priest.bio ?? ''}
          placeholder="Quién eres, cómo atiendes, qué pueden esperar los fieles…"
          className="input"
        />
        <p className="mt-1 text-xs text-muted">Es pública. No incluyas teléfonos ni correos personales.</p>
      </div>

      <fieldset>
        <legend className="label">Idiomas en los que atiendes</legend>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {IDIOMAS.map((i) => (
            <label key={i.code} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="languages"
                value={i.code}
                defaultChecked={priest.languages.includes(i.code)}
                className="accent-accent"
              />
              {i.nombre}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
        <div>
          <label htmlFor="min_notice_hours" className="label">
            Antelación mínima para reservar
          </label>
          <select
            id="min_notice_hours"
            name="min_notice_hours"
            defaultValue={priest.min_notice_hours}
            className="input"
          >
            {MIN_NOTICE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="auto_confirm" className="label">
            Confirmación de citas
          </label>
          <select id="auto_confirm" name="auto_confirm" defaultValue={String(priest.auto_confirm)} className="input">
            <option value="true">Automática: la cita queda confirmada al reservar</option>
            <option value="false">Manual: reviso y confirmo cada cita</option>
          </select>
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <label htmlFor="verification_notes" className="label">
          Datos para verificar que eres sacerdote
        </label>
        <textarea
          id="verification_notes"
          name="verification_notes"
          rows={3}
          defaultValue={verificationNotes ?? ''}
          placeholder="Parroquia donde estás destinado, correo o teléfono institucional de la parroquia o diócesis donde podamos comprobarlo…"
          className="input"
        />
        <p className="mt-1 text-xs text-muted">
          Solo lo ve el equipo de Confesor. No se publica.
        </p>
      </div>

      {state?.error && <p className="text-sm text-red-700">{state.error}</p>}
      {state?.ok && <p className="text-sm text-green-800">{state.ok}</p>}

      <button type="submit" className="btn-primary self-start" disabled={pending}>
        {pending ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </form>
  )
}
