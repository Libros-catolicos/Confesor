'use client'

import { useState } from 'react'
import { Check, Copy } from 'lucide-react'

export function CopiarEnlace({ url }: { url: string }) {
  const [copiado, setCopiado] = useState(false)

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      // Sin permiso de portapapeles: el usuario puede seleccionar el texto
    }
  }

  return (
    <div className="mt-3 flex items-center gap-2">
      <input readOnly value={url} className="input font-mono text-xs" onFocus={(e) => e.currentTarget.select()} />
      <button type="button" onClick={copiar} className="btn-secondary shrink-0" title="Copiar">
        {copiado ? <Check className="h-4 w-4 text-green-700" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  )
}
