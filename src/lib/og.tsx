import { ImageResponse } from 'next/og'

export const OG_SIZE = { width: 1200, height: 630 }

/** Imagen 1200×630 para las tarjetas de Open Graph / X. Sin fuentes externas: usa la del sistema. */
export function imagenOg(titulo: string, subtitulo: string, etiqueta = 'confesor.es') {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          background: 'linear-gradient(135deg, #5b2a86 0%, #3a1a5c 100%)',
          color: '#ffffff',
          fontFamily: 'Georgia, serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontSize: 40, fontWeight: 700 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 64,
              height: 64,
              borderRadius: 16,
              background: 'rgba(255,255,255,0.15)',
              fontSize: 44,
            }}
          >
            ✝
          </div>
          Confesor
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ fontSize: 68, fontWeight: 700, lineHeight: 1.1, letterSpacing: -1 }}>{titulo}</div>
          <div style={{ fontSize: 32, lineHeight: 1.35, color: 'rgba(255,255,255,0.85)', maxWidth: 1000 }}>
            {subtitulo}
          </div>
        </div>
        <div style={{ display: 'flex', fontSize: 28, color: 'rgba(255,255,255,0.7)' }}>{etiqueta}</div>
      </div>
    ),
    OG_SIZE
  )
}
