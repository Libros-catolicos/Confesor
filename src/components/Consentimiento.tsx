'use client'

import Link from 'next/link'
import { CONSENT_TEXT } from '@/lib/legal'

/**
 * Casillas de consentimiento con los textos literales del documento legal (B4).
 * La de servicio es obligatoria y nunca premarcada; la de suscripción es opcional
 * y va visualmente separada. `onServicioChange` permite deshabilitar el botón de envío.
 */
export function CasillaServicio({
  tipo,
  onChange,
}: {
  tipo: 'booking' | 'faithful' | 'priest'
  onChange?: (marcada: boolean) => void
}) {
  return (
    <label className="flex items-start gap-2 text-sm">
      <input
        type="checkbox"
        name="consent"
        required
        className="mt-1 shrink-0 accent-accent"
        onChange={(e) => onChange?.(e.target.checked)}
      />
      <span>
        {CONSENT_TEXT[tipo]}{' '}
        <Link href="/privacidad" target="_blank" className="text-accent underline">
          Política de privacidad
        </Link>
        {tipo === 'priest' && (
          <>
            {' · '}
            <Link href="/condiciones" target="_blank" className="text-accent underline">
              Condiciones de uso
            </Link>
          </>
        )}
      </span>
    </label>
  )
}

export function CasillaMenor() {
  return (
    <label className="flex items-start gap-2 text-sm">
      <input type="checkbox" name="for_minor" className="mt-1 shrink-0 accent-accent" />
      <span>{CONSENT_TEXT.minor}</span>
    </label>
  )
}

export function CasillaRecordatorio() {
  return (
    <label className="flex items-start gap-2 text-sm">
      <input type="checkbox" name="reminder" className="mt-1 shrink-0 accent-accent" />
      <span>{CONSENT_TEXT.reminders}</span>
    </label>
  )
}

export function CasillaNewsletter() {
  return (
    <div className="rounded-lg border border-dashed border-border p-3">
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="newsletter" className="mt-1 shrink-0 accent-accent" />
        <span className="text-muted">
          {CONSENT_TEXT.newsletter}{' '}
          <Link href="/privacidad" target="_blank" className="text-accent underline">
            Política de privacidad
          </Link>
        </span>
      </label>
    </div>
  )
}
