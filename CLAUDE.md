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
