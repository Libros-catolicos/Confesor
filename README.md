# Confesor

Webapp para encontrar sacerdotes cercanos y reservar cita para confesarse o hablar.
Los sacerdotes se registran, publican su parroquia, horarios e idiomas; los fieles
buscan por ubicación/idioma/horario y **reservan sin registrarse**.

## Stack

- **Next.js 16** (App Router, `proxy.ts`, Server Actions) + Tailwind 4
- **Supabase**: Postgres + PostGIS, Auth, RLS. Toda la lógica de negocio está en SQL
  (`supabase/migrations`) para reutilizarla desde la futura app móvil.
- Geocodificación: Nominatim (OpenStreetMap), sin clave.
- Despliegue previsto en Vercel.

## Arranque

```bash
cp .env.example .env.local   # rellenar con el proyecto Supabase "confesor"
npm install
npm run dev
```

Aplicar `supabase/migrations/*.sql` en orden en el SQL Editor del proyecto (o con el MCP).

## Modelo

| Tabla | Qué guarda |
|---|---|
| `profiles` | datos privados del usuario (sacerdote/admin) |
| `priests` | ficha pública: idiomas, bio, estado de verificación |
| `places` | parroquias con punto geográfico y zona horaria |
| `priest_places` | qué sacerdote atiende en qué lugar |
| `availability_rules` | horario semanal recurrente por lugar y tipo |
| `absences` | ausencias puntuales |
| `appointments` | citas de fieles anónimos con `manage_token` para cancelar |

RPCs públicas: `search_priests`, `priest_free_slots`, `book_appointment`,
`get_appointment_by_token`, `cancel_appointment`.

## Roadmap

1. **MVP**: registro de sacerdotes, lugares, horarios, buscador, reserva anónima,
   panel de citas, verificación manual por admin, emails de confirmación.
2. Recordatorios, Google Calendar, interfaz multiidioma.
3. Pestaña **Recursos** (libros de la editorial).
4. App Android/iOS (Capacitor o Expo) reutilizando el mismo backend.
