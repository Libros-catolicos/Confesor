'use client'

import { useEffect } from 'react'

// Registra el service worker (necesario para poder instalar la app y para la
// página de cortesía sin conexión). No guarda ninguna página: véase public/sw.js.
export function ServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const registrar = () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch((e) => {
        console.error('[sw]', e)
      })
    }
    if (document.readyState === 'complete') registrar()
    else {
      window.addEventListener('load', registrar)
      return () => window.removeEventListener('load', registrar)
    }
  }, [])

  return null
}
