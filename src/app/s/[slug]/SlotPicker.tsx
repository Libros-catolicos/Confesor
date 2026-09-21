'use client'

import { useActionState, useMemo, useState } from 'react'
import { claveDia, fmtFecha, fmtHora } from '@/lib/fechas'
import { nombreIdioma } from '@/lib/idiomas'
import { SLOT_TYPE_LABEL, type FreeSlot, type Place, type SlotType } from '@/lib/types'
import { reservar } from './actions'
import { CasillaMenor, CasillaNewsletter, CasillaRecordatorio, CasillaServicio } from '@/components/Consentimiento'

type PlaceLite = Pick<Place, 'id' | 'name' | 'address' | 'city' | 'timezone'>

export function SlotPicker({
  priestId,
  languages,
  places,
  slots,
  lugarInicial,
  fiel,
}: {
  priestId: string
  languages: string[]
  places: PlaceLite[]
  slots: FreeSlot[]
  lugarInicial?: string
  fiel?: { nombre: string; email: string }
}) {
  const [placeId, setPlaceId] = useState(
    places.some((p) => p.id === lugarInicial) ? lugarInicial! : places[0]?.id ?? ''
  )
  const tipos = useMemo(
    () => Array.from(new Set(slots.map((s) => s.type))) as SlotType[],
    [slots]
  )
  const [tipo, setTipo] = useState<SlotType | ''>(tipos.length === 1 ? tipos[0] : '')
  const [dia, setDia] = useState<string | null>(null)
  const [slot, setSlot] = useState<FreeSlot | null>(null)
  const [state, action, pending] = useActionState(reservar, undefined)
  const [consentido, setConsentido] = useState(false)

  const place = places.find((p) => p.id === placeId)
  const tz = place?.timezone ?? 'Europe/Madrid'

  const filtrados = useMemo(
    () => slots.filter((s) => s.place_id === placeId && (!tipo || s.type === tipo)),
    [slots, placeId, tipo]
  )

  const porDia = useMemo(() => {
    const m = new Map<string, FreeSlot[]>()
    for (const s of filtrados) {
      const k = claveDia(s.starts_at, tz)
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(s)
    }
    return m
  }, [filtrados, tz])

  const dias = Array.from(porDia.keys()).sort()
  const diaActivo = dia && porDia.has(dia) ? dia : dias[0] ?? null
  const horas = diaActivo ? porDia.get(diaActivo)! : []

  function cambiar<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v)
      setSlot(null)
    }
  }

  if (slots.length === 0) {
    return (
      <p className="mt-4 rounded-lg bg-accent-soft p-4 text-sm">
        Este sacerdote no tiene huecos disponibles en los próximos 14 días.
      </p>
    )
  }

  return (
    <div className="mt-4 flex flex-col gap-4">
      {(places.length > 1 || tipos.length > 1) && (
        <div className="grid gap-2 sm:grid-cols-2">
          {places.length > 1 && (
            <select value={placeId} onChange={(e) => cambiar(setPlaceId)(e.target.value)} className="input">
              {places.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          )}
          {tipos.length > 1 && (
            <select
              value={tipo}
              onChange={(e) => cambiar(setTipo)(e.target.value as SlotType | '')}
              className="input"
            >
              <option value="">Confesión o conversación</option>
              {tipos.map((t) => (
                <option key={t} value={t}>
                  {SLOT_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {dias.length === 0 ? (
        <p className="text-sm text-muted">No hay huecos con estos filtros.</p>
      ) : (
        <>
          <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
            {dias.map((d) => {
              const primero = porDia.get(d)![0]
              const activo = d === diaActivo
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => cambiar(setDia)(d)}
                  className={`shrink-0 rounded-lg border px-3 py-2 text-left text-xs ${
                    activo
                      ? 'border-accent bg-accent text-white'
                      : 'border-border bg-card hover:bg-accent-soft'
                  }`}
                >
                  <span className="block font-medium">
                    {fmtFecha(primero.starts_at, tz).split(',')[0]}
                  </span>
                  <span className={activo ? 'text-white/80' : 'text-muted'}>
                    {fmtFecha(primero.starts_at, tz).split(',')[1]?.trim()}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
            {horas.map((s) => {
              const activo = slot?.starts_at === s.starts_at
              return (
                <button
                  key={s.starts_at}
                  type="button"
                  onClick={() => setSlot(s)}
                  className={`rounded-lg border py-2 text-sm ${
                    activo
                      ? 'border-accent bg-accent text-white'
                      : 'border-border bg-card hover:bg-accent-soft'
                  }`}
                  aria-label={`${fmtHora(s.starts_at, tz)} · ${SLOT_TYPE_LABEL[s.type]}`}
                >
                  {fmtHora(s.starts_at, tz)}
                </button>
              )
            })}
          </div>
        </>
      )}

      {slot && place && (
        <form action={action} className="mt-2 flex flex-col gap-3 rounded-lg bg-accent-soft p-4">
          <input type="hidden" name="priest_id" value={priestId} />
          <input type="hidden" name="place_id" value={place.id} />
          <input type="hidden" name="starts_at" value={slot.starts_at} />
          <input type="hidden" name="type" value={slot.type} />

          <p className="text-sm">
            <span className="font-medium">{SLOT_TYPE_LABEL[slot.type]}</span> ·{' '}
            {fmtFecha(slot.starts_at, tz)} a las{' '}
            <span className="font-medium">{fmtHora(slot.starts_at, tz)}</span> ({slot.slot_minutes} min)
            <br />
            <span className="text-muted">{place.name}</span>
          </p>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="guest_name" className="label">
                Tu nombre
              </label>
              <input
                id="guest_name"
                name="guest_name"
                required
                autoComplete="given-name"
                placeholder="Basta el nombre de pila"
                defaultValue={fiel?.nombre ?? ''}
                className="input"
              />
            </div>
            <div>
              <label htmlFor="language" className="label">
                Idioma
              </label>
              <select id="language" name="language" className="input" defaultValue={languages[0]}>
                {languages.map((l) => (
                  <option key={l} value={l}>
                    {nombreIdioma(l)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="guest_email" className="label">
                Email
              </label>
              <input
                id="guest_email"
                name="guest_email"
                type="email"
                autoComplete="email"
                required
                defaultValue={fiel?.email ?? ''}
                className="input"
              />
              <p className="mt-1 text-xs text-muted">Usa un correo personal, no uno de trabajo o compartido.</p>
            </div>
          </div>
          <p className="text-xs text-muted">
            El sacerdote solo verá tu nombre. Tu email lo usa Confesor para confirmarte la cita y avisarte
            de cambios; nunca se lo mostramos.
            {fiel && ' La cita quedará guardada en tu cuenta.'}
          </p>

          <div className="flex flex-col gap-2 border-t border-border/60 pt-3">
            <CasillaServicio tipo="booking" onChange={setConsentido} />
            <CasillaRecordatorio />
            <CasillaMenor />
          </div>
          <CasillaNewsletter />

          {state?.error && <p className="text-sm text-red-700">{state.error}</p>}

          <button type="submit" className="btn-primary self-start" disabled={pending || !consentido}>
            {pending ? 'Reservando…' : 'Confirmar reserva'}
          </button>
        </form>
      )}
    </div>
  )
}
