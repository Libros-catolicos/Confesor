'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { LocateFixed, Search } from 'lucide-react'
import { IDIOMAS } from '@/lib/idiomas'

/**
 * Formulario de búsqueda. Navega a /buscar con:
 *  q     texto de ubicación (se geocodifica en el servidor)  ó
 *  lat, lng  coordenadas del navegador
 *  idioma, tipo, radio
 */
export type SearchDefaults = { q?: string; idioma?: string; tipo?: string; radio?: string }

export function SearchForm({
  compact = false,
  defaults = {},
}: {
  compact?: boolean
  defaults?: SearchDefaults
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [geoError, setGeoError] = useState<string | null>(null)
  const [locating, setLocating] = useState(false)

  function navegar(extra: Record<string, string>) {
    const form = document.getElementById('search-form') as HTMLFormElement
    const data = new FormData(form)
    const sp = new URLSearchParams()
    for (const [k, v] of data.entries()) {
      if (typeof v === 'string' && v.trim()) sp.set(k, v.trim())
    }
    for (const [k, v] of Object.entries(extra)) sp.set(k, v)
    startTransition(() => router.push(`/buscar?${sp.toString()}`))
  }

  function usarUbicacion() {
    if (!navigator.geolocation) {
      setGeoError('Tu navegador no permite obtener la ubicación.')
      return
    }
    setLocating(true)
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        const form = document.getElementById('search-form') as HTMLFormElement
        ;(form.elements.namedItem('q') as HTMLInputElement).value = ''
        navegar({
          lat: pos.coords.latitude.toFixed(5),
          lng: pos.coords.longitude.toFixed(5),
        })
      },
      () => {
        setLocating(false)
        setGeoError('No hemos podido obtener tu ubicación. Escribe una dirección o ciudad.')
      },
      { enableHighAccuracy: false, timeout: 8000 }
    )
  }

  return (
    <form
      id="search-form"
      onSubmit={(e) => {
        e.preventDefault()
        navegar({})
      }}
      className="flex flex-col gap-3"
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <input
            name="q"
            defaultValue={defaults.q ?? ''}
            placeholder="Ciudad, barrio o dirección"
            className="input pr-10"
            autoComplete="off"
          />
          <button
            type="button"
            onClick={usarUbicacion}
            title="Usar mi ubicación"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-accent"
            disabled={locating}
          >
            <LocateFixed className={`h-5 w-5 ${locating ? 'animate-pulse' : ''}`} />
          </button>
        </div>
        <button type="submit" className="btn-primary" disabled={pending}>
          <Search className="h-4 w-4" />
          Buscar
        </button>
      </div>

      <div className={`grid gap-2 ${compact ? 'grid-cols-3' : 'sm:grid-cols-3'}`}>
        <select name="idioma" defaultValue={defaults.idioma ?? ''} className="input">
          <option value="">Cualquier idioma</option>
          {IDIOMAS.map((i) => (
            <option key={i.code} value={i.code}>
              {i.nombre}
            </option>
          ))}
        </select>
        <select name="tipo" defaultValue={defaults.tipo ?? ''} className="input">
          <option value="">Confesión o conversación</option>
          <option value="confesion">Confesión</option>
          <option value="conversacion">Conversación</option>
        </select>
        <select name="radio" defaultValue={defaults.radio ?? '25'} className="input">
          <option value="5">Hasta 5 km</option>
          <option value="10">Hasta 10 km</option>
          <option value="25">Hasta 25 km</option>
          <option value="50">Hasta 50 km</option>
          <option value="100">Hasta 100 km</option>
        </select>
      </div>

      {geoError && <p className="text-sm text-red-700">{geoError}</p>}
    </form>
  )
}
