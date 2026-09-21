# Plantillas de correo de Supabase Auth (en español)

Se pegan en el panel de Supabase: **Authentication → Email Templates**. Cada plantilla tiene
un asunto (*Subject*) y un cuerpo HTML (*Body*). Las variables `{{ .ConfirmationURL }}`,
`{{ .Email }}` y `{{ .NewEmail }}` las rellena Supabase.

El remitente se configura en **Project Settings → Authentication → SMTP Settings**
(*Sender name*: `Confesor`, *Sender email*: `cuentas@confesor.es`).

---

## Confirm sign up (confirmación de registro)

**Subject:** `Confirma tu cuenta en Confesor`

```html
<p>Hola.</p>
<p>Gracias por crear tu cuenta en Confesor. Para activarla, confirma tu email:</p>
<p><a href="{{ .ConfirmationURL }}">Confirmar mi email</a></p>
<p>Si no has creado ninguna cuenta, ignora este mensaje.</p>
<p>— Confesor</p>
```

## Reset password (recuperación de contraseña)

**Subject:** `Crea una contraseña nueva en Confesor`

```html
<p>Hola.</p>
<p>Hemos recibido una solicitud para cambiar la contraseña de tu cuenta ({{ .Email }}).</p>
<p><a href="{{ .ConfirmationURL }}">Crear una contraseña nueva</a></p>
<p>El enlace caduca en una hora. Si no has pedido este cambio, ignora este mensaje: tu contraseña seguirá siendo la misma.</p>
<p>— Confesor</p>
```

## Change email address (cambio de email)

**Subject:** `Confirma tu nuevo email en Confesor`

```html
<p>Hola.</p>
<p>Has pedido cambiar el email de tu cuenta de {{ .Email }} a {{ .NewEmail }}. Para completar el cambio, confírmalo:</p>
<p><a href="{{ .ConfirmationURL }}">Confirmar el nuevo email</a></p>
<p>Si no has pedido este cambio, ignora este mensaje y tu email seguirá siendo el mismo.</p>
<p>— Confesor</p>
```

## Magic link e Invite user

No se usan en Confesor. Pueden dejarse como están.

## Reauthentication (confirmación de identidad)

Solo se usa si se activa la reautenticación para cambiar contraseña. Por si acaso:

**Subject:** `Tu código de confirmación de Confesor`

```html
<p>Tu código de confirmación es: <strong>{{ .Token }}</strong></p>
<p>Caduca en unos minutos. Si no lo has pedido, ignora este mensaje.</p>
<p>— Confesor</p>
```

---

## Ajustes relacionados (Authentication → URL Configuration)

- **Site URL:** `https://confesor.es`
- **Redirect URLs:** `https://confesor.es/**` y, mientras se desarrolle, `http://localhost:3001/**`

## Ajustes relacionados (Authentication → Sign In / Providers → Email)

- **Confirm email:** activado en producción (hoy está desactivado para pruebas).
- **Secure email change:** activado (pide confirmar el cambio desde el email nuevo).
