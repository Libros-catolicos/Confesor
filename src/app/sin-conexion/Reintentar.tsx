'use client'

import { RefreshCw } from 'lucide-react'

export function Reintentar() {
  return (
    <button type="button" onClick={() => window.location.reload()} className="btn-primary mt-6">
      <RefreshCw className="h-4 w-4" aria-hidden />
      Reintentar
    </button>
  )
}
