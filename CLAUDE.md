@AGENTS.md

# Confesor — notas para el agente

- Idioma del código/UI: español en textos y comentarios; nombres de tablas y columnas en inglés.
- **Los fieles no tienen cuenta.** Reservan por RPC `book_appointment` y gestionan con `manage_token`.
  Nunca dar acceso `anon` de lectura a `appointments`.
- Toda la lógica de disponibilidad vive en SQL (`priest_free_slots`, `search_priests`), no en TS:
  la app móvil futura debe poder reutilizarla.
- Horas en UTC en BD; en UI se muestran en la zona horaria del **lugar** (`places.timezone`), no del navegador.
- Al crear tablas nuevas: RLS **y** `grant` a `anon`/`authenticated`, si no da "permission denied".
- Solo un admin cambia `priests.status` (trigger `priests_guard_status`).
- Sin reseñas ni valoraciones de sacerdotes; minimizar datos personales (art. 9 RGPD).
- Migraciones en `supabase/migrations/NNNN_nombre.sql`, numeradas.
- Recursos: tablas `articles` y `books` (RLS: lectura pública, escritura admin) gestionadas en `/admin`. Portadas en bucket `portadas`. Constantes/tipos compartidos con cliente en `src/lib/contenido.ts`; el cargador de servidor en `src/lib/recursos.ts`.
- Datos privados del sacerdote (token de calendario, notas de verificación) van en `priest_private`,
  nunca en `priests` (que es de lectura pública). Supabase concede permisos a `anon` por defecto en
  tablas nuevas: revocar explícitamente en tablas privadas (ver migración 0007).
- Geocodificación con Photon (komoot) y respaldo Nominatim; el alta de lugar es en dos pasos
  (buscar → elegir candidato) porque los geocodificadores fallan con direcciones ambiguas.
- Zona `/admin`: `requireAdmin()` en cada página y action (rol en `profiles.role`). Para nombrar admin: `update profiles set role = 'admin' where email = ...`.
- Emails: `src/lib/email.ts` (Resend por REST) y `src/lib/notificaciones.ts`; se disparan con `after()` desde las server actions. Enlaces del sacerdote por email: `/cita/sacerdote/[priest_token]`.
- Cuenta de fiel (opcional, rol `fiel`): `/registro/fiel`, `/mi-cuenta`. Solo guarda nombre, email y
  fechas (tabla `confessions` + citas ligadas por `appointments.user_id`). `delete_my_account()` anonimiza
  y borra. Los sacerdotes nunca ven el historial. Registro de sacerdote en `/registro/sacerdote`.
- Cron diario `/api/cron/avisos` (vercel.json): recordatorio de cita el día antes y aviso por tiempo sin
  confesarse. Requiere `SUPABASE_SECRET_KEY` y `CRON_SECRET` en Vercel.
- Legal (fase 1 hecha): textos literales en `src/content/legal/*.ts` (NO reescribir; versión en `src/lib/legal.ts`);
  casillas con textos de `CONSENT_TEXT`; prueba en `consent_log` y lista en `newsletter_subscribers`
  (solo service_role, vía `src/lib/supabase/admin.ts` + `src/lib/consentimiento.ts`). Recordatorios opt-in.
  Asuntos de correo neutros (nunca "confesión"). Bloque comercial B5 solo a suscritos (`src/content/comercial.ts`).
- Contacto del fiel: solo email (sin teléfono, sin texto libre, nunca el motivo). **El sacerdote solo ve el
  nombre**: `authenticated` no tiene `select` sobre `appointments.guest_email` (grant por columnas), y las
  funciones `calendar_feed`/`get_appointment_notification` no lo devuelven. Los correos se envían desde
  `notificaciones.ts` con `createAdminClient()` (necesita `SUPABASE_SECRET_KEY`; en local no hay, solo log).
  Sin chat: solo confirmar/rechazar/cancelar proponiendo otra hora, y el botón "Ya estoy aquí" del fiel
  (`mark_arrived`, ventana 1 h antes → fin de la cita) que avisa al sacerdote por email.
- Retención: el cron llama a `purge_appointments()` (0015): a los 7 días del fin de la cita borra las reservas
  sin cuenta y anonimiza (nombre 'Fiel', sin email, tokens rotados, `purged_at`) las ligadas a cuenta de fiel.
  RLS: el sacerdote solo ve citas hasta 7 días después. Enlaces caducados → `cita/[token]/not-found.tsx`.
- Textos legales en versión 2 (modelo solo email / sacerdote ve solo el nombre). Página `/para-sacerdotes`
  es la de aterrizaje para anunciar; Open Graph en `src/lib/og.tsx` + `opengraph-image.tsx`.
- Documento de verificación (celebret), opcional: bucket privado `verificacion` (carpeta = uuid del sacerdote),
  ruta en `priest_private.verification_doc_path`; el admin lo abre con enlace firmado de 10 min. Se conserva
  mientras exista la cuenta; el trigger `priests_delete_storage` borra la fila de storage al borrar el sacerdote
  (para no dejar el blob huérfano, al implementar "borrar cuenta de sacerdote" llamar antes a
  `storage.from('verificacion').remove`). `serverActions.bodySizeLimit` = 6mb en next.config.ts.
- PWA: `src/app/manifest.ts`, iconos estáticos en `public/` (generados con ImageResponse; para rehacerlos,
  una ruta temporal con `src/lib/og`-style y curl a /public), `public/sw.js` registrado por
  `src/components/ServiceWorker.tsx`, aviso de instalación en `src/components/InstalarApp.tsx` y página
  `/sin-conexion`. **El service worker NO cachea páginas** (datos personales): navegación siempre a red,
  solo estáticos en caché. Cabeceras de seguridad y de `/sw.js` en next.config.ts. Falta: notificaciones push.
- Enlace público del sacerdote: cuelga de la raíz (`confesor.es/juan-perez`, `src/app/[slug]`), con redirección
  308 desde `/s/:slug` en next.config.ts. **Al crear una ruta nueva de primer nivel hay que añadirla a
  `RUTAS_RESERVADAS` en `src/lib/slug.ts` y a `slug_disponible()` en SQL (0017)**, si no un sacerdote podría
  ocuparla. El slug se genera limpio (`slug_para_nombre`) y el sacerdote puede cambiarlo en su ficha.
- Cartel imprimible: `/api/cartel` (sesión de sacerdote) genera un A4 en PDF con QR — `src/lib/cartel.ts`
  (pdf-lib + qrcode). Solo datos públicos. Las tildes funcionan con Helvetica (WinAnsi).
- Aviso al administrador: `notificarAltaSacerdote` avisa a `emailAdmin()` (`ADMIN_EMAIL` o
  editor@libroscatolicos.es) en cada alta de sacerdote, para que la verifique.
