// Envío de correos con Resend (API REST, sin dependencias).
// Sin RESEND_API_KEY no se envía nada: se registra en el log y la app sigue.
//
// Variables de entorno (Vercel → Settings → Environment Variables):
//   RESEND_API_KEY   clave de Resend
//   EMAIL_FROM       remitente, p. ej. "Confesor <citas@tudominio.com>" (dominio verificado en Resend)

export interface Correo {
  to: string
  subject: string
  html: string
  text: string
  replyTo?: string
}

export async function enviarEmail(correo: Correo): Promise<boolean> {
  const key = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM ?? 'Confesor <onboarding@resend.dev>'

  if (!key) {
    console.warn(`[email] RESEND_API_KEY no configurada. No se envía: "${correo.subject}" → ${correo.to}`)
    return false
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [correo.to],
        subject: correo.subject,
        html: correo.html,
        text: correo.text,
        reply_to: correo.replyTo,
      }),
    })
    if (!res.ok) {
      console.error('[email] Resend', res.status, await res.text())
      return false
    }
    return true
  } catch (e) {
    console.error('[email] error de red', e)
    return false
  }
}

/** Envoltorio HTML sencillo y legible en cualquier cliente de correo */
export function plantilla(titulo: string, cuerpoHtml: string, boton?: { texto: string; url: string; secundario?: { texto: string; url: string } }) {
  const btn = (t: string, u: string, primario: boolean) =>
    `<a href="${u}" style="display:inline-block;margin:6px 8px 6px 0;padding:10px 18px;border-radius:8px;font-weight:600;text-decoration:none;${
      primario ? 'background:#5b2a86;color:#ffffff' : 'background:#f1eaf7;color:#5b2a86'
    }">${t}</a>`
  return `<!doctype html><html lang="es"><body style="margin:0;padding:24px;background:#faf8f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f1a17">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e7e1da;border-radius:12px;padding:28px">
<p style="margin:0 0 18px;font-weight:700;color:#5b2a86">✝ Confesor</p>
<h1 style="font-size:20px;margin:0 0 14px">${titulo}</h1>
<div style="font-size:15px;line-height:1.55">${cuerpoHtml}</div>
${boton ? `<p style="margin:22px 0 0">${btn(boton.texto, boton.url, true)}${boton.secundario ? btn(boton.secundario.texto, boton.secundario.url, false) : ''}</p>` : ''}
<p style="margin:26px 0 0;font-size:12px;color:#6b625c">Este correo se ha enviado desde Confesor. Los enlaces son privados: no los compartas.</p>
</div></body></html>`
}
