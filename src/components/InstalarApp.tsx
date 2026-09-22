'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'
import { Share, SquarePlus, X } from 'lucide-react'

interface PromptInstalacion extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const OCULTO = 'confesor:instalar-oculto'

// Valores que solo existen en el navegador: en el servidor devuelven `servidor`
// y se leen de verdad tras la hidratación.
const sinSuscripcion = () => () => {}
function useNavegador<T>(leer: () => T, servidor: T) {
  return useSyncExternalStore(sinSuscripcion, leer, () => servidor)
}

function yaInstalada() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as { standalone?: boolean }).standalone === true
  )
}

function esIosSafari() {
  const ua = navigator.userAgent
  return /iPad|iPhone|iPod/.test(ua) && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua)
}

function estaDescartada() {
  try {
    return localStorage.getItem(OCULTO) === '1'
  } catch {
    // Navegación privada o almacenamiento bloqueado: se muestra igual
    return false
  }
}

// Invitación discreta a instalar la app. En Android/Chrome usa el diálogo del
// navegador; en iPhone no existe esa API, así que explicamos los dos toques.
export function InstalarApp() {
  const [prompt, setPrompt] = useState<PromptInstalacion | null>(null)
  const [cerrada, setCerrada] = useState(false)
  const instalada = useNavegador(yaInstalada, false)
  const descartada = useNavegador(estaDescartada, true)
  const ios = useNavegador(esIosSafari, false)

  useEffect(() => {
    const alPoder = (e: Event) => {
      e.preventDefault()
      setPrompt(e as PromptInstalacion)
    }
    const alInstalar = () => setCerrada(true)
    window.addEventListener('beforeinstallprompt', alPoder)
    window.addEventListener('appinstalled', alInstalar)
    return () => {
      window.removeEventListener('beforeinstallprompt', alPoder)
      window.removeEventListener('appinstalled', alInstalar)
    }
  }, [])

  if (instalada || descartada || cerrada || (!ios && !prompt)) return null

  const cerrar = () => {
    setCerrada(true)
    try {
      localStorage.setItem(OCULTO, '1')
    } catch {
      // Sin almacenamiento solo se oculta durante esta visita
    }
  }

  const instalar = async () => {
    if (!prompt) return
    await prompt.prompt()
    await prompt.userChoice
    setPrompt(null)
    setCerrada(true)
  }

  return (
    <div className="relative rounded-xl border border-border bg-card p-4 pr-10 text-sm">
      <button
        type="button"
        onClick={cerrar}
        aria-label="Ocultar"
        className="absolute right-2 top-2 rounded-lg p-1 text-muted hover:bg-accent-soft"
      >
        <X className="h-4 w-4" aria-hidden />
      </button>
      <p className="font-medium">Ten Confesor a mano</p>
      {prompt ? (
        <>
          <p className="mt-1 text-muted">
            Instálalo en tu teléfono y ábrelo como una app. Ocupa unos pocos kilobytes.
          </p>
          <button type="button" onClick={instalar} className="btn-primary mt-3">
            Instalar
          </button>
        </>
      ) : (
        <p className="mt-1 text-muted">
          Añádelo a tu pantalla de inicio: toca{' '}
          <Share className="inline h-4 w-4 align-text-bottom" aria-label="Compartir" /> y luego{' '}
          <SquarePlus className="inline h-4 w-4 align-text-bottom" aria-label="Añadir a pantalla de inicio" />{' '}
          <span className="text-foreground">Añadir a pantalla de inicio</span>.
        </p>
      )}
    </div>
  )
}
