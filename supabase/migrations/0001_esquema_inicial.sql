-- =====================================================================
-- Confesor · esquema inicial
-- Sacerdotes registrados; fieles reservan sin cuenta (token de gestión).
-- Toda la lógica de negocio vive aquí para reutilizarla desde web y app.
-- =====================================================================

create extension if not exists postgis with schema extensions;
create extension if not exists btree_gist with schema extensions;
create extension if not exists unaccent with schema extensions;

-- ---------- Tipos ----------
create type public.user_role as enum ('sacerdote', 'admin');
create type public.priest_status as enum ('pendiente', 'verificado', 'rechazado', 'suspendido');
create type public.slot_type as enum ('confesion', 'conversacion');
create type public.appointment_status as enum ('pendiente', 'confirmada', 'cancelada', 'completada', 'no_presentado');

-- ---------- Utilidades ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- profiles: datos privados del usuario (solo sacerdotes y admin) ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null default 'sacerdote',
  full_name text not null,
  email text not null,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------- priests: ficha pública del sacerdote ----------
create table public.priests (
  id uuid primary key references public.profiles(id) on delete cascade,
  slug text not null unique,
  display_name text not null,
  bio text,
  diocese text,
  languages text[] not null default '{es}',          -- códigos ISO 639-1
  status public.priest_status not null default 'pendiente',
  verification_notes text,                           -- lo que aporta el sacerdote para verificarse
  photo_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger priests_updated_at before update on public.priests
  for each row execute function public.set_updated_at();

-- Solo un admin puede cambiar el estado de verificación
create or replace function public.priests_guard_status()
returns trigger language plpgsql as $$
begin
  if new.status <> old.status and not public.is_admin() then
    raise exception 'Solo un administrador puede cambiar el estado de verificación';
  end if;
  return new;
end $$;
create trigger priests_guard_status before update on public.priests
  for each row execute function public.priests_guard_status();

-- Alta automática: al crear el usuario en auth se crea el perfil y la ficha
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare
  v_name text := coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1));
  v_slug text;
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, v_name, new.email);

  v_slug := regexp_replace(lower(unaccent(v_name)), '[^a-z0-9]+', '-', 'g');
  v_slug := trim(both '-' from v_slug) || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);

  insert into public.priests (id, slug, display_name, languages)
  values (
    new.id,
    v_slug,
    v_name,
    coalesce((select array_agg(x) from jsonb_array_elements_text(new.raw_user_meta_data -> 'languages') x), '{es}')
  );
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- places: parroquias / centros ----------
create table public.places (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null,
  city text,
  country text not null default 'ES',
  location extensions.geography(Point, 4326) not null,
  timezone text not null default 'Europe/Madrid',
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index places_location_idx on public.places using gist (location);
create trigger places_updated_at before update on public.places
  for each row execute function public.set_updated_at();

create table public.priest_places (
  priest_id uuid not null references public.priests(id) on delete cascade,
  place_id uuid not null references public.places(id) on delete cascade,
  primary key (priest_id, place_id)
);

-- ---------- availability_rules: horario semanal recurrente ----------
create table public.availability_rules (
  id uuid primary key default gen_random_uuid(),
  priest_id uuid not null references public.priests(id) on delete cascade,
  place_id uuid not null references public.places(id) on delete cascade,
  weekday smallint not null check (weekday between 1 and 7),   -- ISO: 1 lunes ... 7 domingo
  start_time time not null,
  end_time time not null,
  slot_minutes smallint not null default 20 check (slot_minutes between 5 and 120),
  type public.slot_type not null default 'confesion',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (end_time > start_time)
);
create index availability_rules_priest_idx on public.availability_rules (priest_id);

-- ---------- absences: ausencias puntuales (día entero o tramo) ----------
create table public.absences (
  id uuid primary key default gen_random_uuid(),
  priest_id uuid not null references public.priests(id) on delete cascade,
  date date not null,
  start_time time,
  end_time time,
  note text,
  created_at timestamptz not null default now(),
  check ((start_time is null and end_time is null) or (start_time is not null and end_time is not null and end_time > start_time))
);
create index absences_priest_date_idx on public.absences (priest_id, date);

-- ---------- appointments: citas de fieles sin cuenta ----------
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  priest_id uuid not null references public.priests(id) on delete cascade,
  place_id uuid not null references public.places(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  type public.slot_type not null,
  language text not null,
  status public.appointment_status not null default 'pendiente',
  guest_name text not null,
  guest_email text,
  guest_phone text,
  manage_token uuid not null default gen_random_uuid() unique,   -- para cancelar desde el email
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at),
  check (guest_email is not null or guest_phone is not null),
  -- Un sacerdote no puede tener dos citas activas solapadas
  exclude using gist (
    priest_id with =,
    tstzrange(starts_at, ends_at) with &&
  ) where (status in ('pendiente', 'confirmada'))
);
create index appointments_priest_starts_idx on public.appointments (priest_id, starts_at);
create trigger appointments_updated_at before update on public.appointments
  for each row execute function public.set_updated_at();

-- =====================================================================
-- Funciones de negocio
-- =====================================================================

-- Huecos libres de un sacerdote en un rango de fechas (máx. 60 días).
-- Reglas semanales - ausencias - citas activas. Horas en UTC; el cálculo
-- usa la zona horaria de cada lugar.
create or replace function public.priest_free_slots(p_priest_id uuid, p_from date, p_to date)
returns table (place_id uuid, starts_at timestamptz, ends_at timestamptz, type public.slot_type, slot_minutes smallint)
language sql stable security definer set search_path = public, extensions as $$
  with days as (
    select d::date as day
    from generate_series(p_from, least(p_to, p_from + 60), interval '1 day') d
  ),
  candidate as (
    select
      r.place_id,
      r.type,
      r.slot_minutes,
      pl.timezone as tz,
      dy.day,
      ((dy.day + r.start_time)::timestamp at time zone pl.timezone) + (n * r.slot_minutes) * interval '1 minute' as starts_at,
      ((dy.day + r.start_time)::timestamp at time zone pl.timezone) + ((n + 1) * r.slot_minutes) * interval '1 minute' as ends_at
    from public.availability_rules r
    join public.places pl on pl.id = r.place_id
    join days dy on extract(isodow from dy.day) = r.weekday
    cross join lateral generate_series(
      0,
      floor(extract(epoch from (r.end_time - r.start_time)) / 60 / r.slot_minutes)::int - 1
    ) n
    where r.priest_id = p_priest_id and r.active
  )
  select c.place_id, c.starts_at, c.ends_at, c.type, c.slot_minutes
  from candidate c
  where c.starts_at > now()
    and not exists (
      select 1 from public.absences a
      where a.priest_id = p_priest_id
        and a.date = c.day
        and (
          a.start_time is null
          or tstzrange(
               (a.date + a.start_time)::timestamp at time zone c.tz,
               (a.date + a.end_time)::timestamp at time zone c.tz
             ) && tstzrange(c.starts_at, c.ends_at)
        )
    )
    and not exists (
      select 1 from public.appointments ap
      where ap.priest_id = p_priest_id
        and ap.status in ('pendiente', 'confirmada')
        and tstzrange(ap.starts_at, ap.ends_at) && tstzrange(c.starts_at, c.ends_at)
    )
  order by c.starts_at;
$$;

-- Búsqueda pública: sacerdotes verificados cerca de un punto, filtrando por
-- idioma, tipo y ventana temporal. Devuelve una fila por sacerdote+lugar.
create or replace function public.search_priests(
  p_lat double precision,
  p_lng double precision,
  p_radius_km double precision default 25,
  p_languages text[] default null,
  p_from timestamptz default now(),
  p_to timestamptz default now() + interval '14 days',
  p_type public.slot_type default null
)
returns table (
  priest_id uuid,
  slug text,
  display_name text,
  photo_url text,
  languages text[],
  place_id uuid,
  place_name text,
  address text,
  city text,
  distance_km double precision,
  next_slot timestamptz,
  free_slots bigint
)
language sql stable security definer set search_path = public, extensions as $$
  with origin as (
    select st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography as g
  )
  select
    p.id,
    p.slug,
    p.display_name,
    p.photo_url,
    p.languages,
    pl.id,
    pl.name,
    pl.address,
    pl.city,
    st_distance(pl.location, o.g) / 1000 as distance_km,
    min(s.starts_at) as next_slot,
    count(s.starts_at) as free_slots
  from public.priests p
  join public.priest_places pp on pp.priest_id = p.id
  join public.places pl on pl.id = pp.place_id
  cross join origin o
  left join lateral (
    select fs.starts_at
    from public.priest_free_slots(
      p.id,
      (p_from at time zone pl.timezone)::date,
      (p_to at time zone pl.timezone)::date
    ) fs
    where fs.place_id = pl.id
      and fs.starts_at between p_from and p_to
      and (p_type is null or fs.type = p_type)
  ) s on true
  where p.status = 'verificado'
    and st_dwithin(pl.location, o.g, least(p_radius_km, 200) * 1000)
    and (p_languages is null or p.languages && p_languages)
  group by p.id, pl.id, o.g
  order by distance_km;
$$;

-- Reserva sin cuenta. Valida que el hueco exista y esté libre.
create or replace function public.book_appointment(
  p_priest_id uuid,
  p_place_id uuid,
  p_starts_at timestamptz,
  p_type public.slot_type,
  p_language text,
  p_guest_name text,
  p_guest_email text default null,
  p_guest_phone text default null
)
returns table (appointment_id uuid, manage_token uuid, ends_at timestamptz)
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_slot record;
  v_priest record;
begin
  if coalesce(trim(p_guest_name), '') = '' then
    raise exception 'El nombre es obligatorio';
  end if;
  if coalesce(trim(p_guest_email), '') = '' and coalesce(trim(p_guest_phone), '') = '' then
    raise exception 'Indica un email o un teléfono de contacto';
  end if;

  select * into v_priest from public.priests where id = p_priest_id and status = 'verificado';
  if not found then
    raise exception 'Sacerdote no disponible';
  end if;
  if not (p_language = any (v_priest.languages)) then
    raise exception 'El sacerdote no atiende en ese idioma';
  end if;

  select * into v_slot
  from public.priest_free_slots(
    p_priest_id,
    (p_starts_at at time zone 'UTC')::date - 1,
    (p_starts_at at time zone 'UTC')::date + 1
  ) s
  where s.place_id = p_place_id and s.starts_at = p_starts_at and s.type = p_type
  limit 1;
  if not found then
    raise exception 'Ese hueco ya no está disponible';
  end if;

  return query
    insert into public.appointments
      (priest_id, place_id, starts_at, ends_at, type, language, guest_name, guest_email, guest_phone)
    values
      (p_priest_id, p_place_id, v_slot.starts_at, v_slot.ends_at, p_type, p_language,
       trim(p_guest_name), nullif(trim(p_guest_email), ''), nullif(trim(p_guest_phone), ''))
    returning id, appointments.manage_token, appointments.ends_at;
end $$;

-- Consulta de una cita por su token (para la página de gestión del fiel)
create or replace function public.get_appointment_by_token(p_token uuid)
returns table (
  id uuid, starts_at timestamptz, ends_at timestamptz, type public.slot_type, language text,
  status public.appointment_status, guest_name text,
  priest_name text, priest_slug text, place_name text, address text, city text, timezone text
)
language sql stable security definer set search_path = public as $$
  select a.id, a.starts_at, a.ends_at, a.type, a.language, a.status, a.guest_name,
         p.display_name, p.slug, pl.name, pl.address, pl.city, pl.timezone
  from public.appointments a
  join public.priests p on p.id = a.priest_id
  join public.places pl on pl.id = a.place_id
  where a.manage_token = p_token;
$$;

-- Cancelación por el fiel con su token
create or replace function public.cancel_appointment(p_token uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  update public.appointments
  set status = 'cancelada'
  where manage_token = p_token
    and status in ('pendiente', 'confirmada')
    and starts_at > now();
  get diagnostics v_count = row_count;
  return v_count > 0;
end $$;

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.priests enable row level security;
alter table public.places enable row level security;
alter table public.priest_places enable row level security;
alter table public.availability_rules enable row level security;
alter table public.absences enable row level security;
alter table public.appointments enable row level security;

-- profiles: solo el dueño y el admin
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

-- priests: ficha pública si está verificado; el dueño y el admin siempre
create policy priests_select on public.priests for select to anon, authenticated
  using (status = 'verificado' or id = auth.uid() or public.is_admin());
create policy priests_update on public.priests for update to authenticated
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

-- places: lectura pública; crea cualquier sacerdote; edita quien lo creó o admin
create policy places_select on public.places for select to anon, authenticated using (true);
create policy places_insert on public.places for insert to authenticated with check (created_by = auth.uid());
create policy places_update on public.places for update to authenticated
  using (created_by = auth.uid() or public.is_admin()) with check (created_by = auth.uid() or public.is_admin());
create policy places_delete on public.places for delete to authenticated
  using (created_by = auth.uid() or public.is_admin());

-- priest_places: lectura pública; gestiona el propio sacerdote
create policy priest_places_select on public.priest_places for select to anon, authenticated using (true);
create policy priest_places_insert on public.priest_places for insert to authenticated with check (priest_id = auth.uid());
create policy priest_places_delete on public.priest_places for delete to authenticated using (priest_id = auth.uid() or public.is_admin());

-- availability_rules: lectura pública; gestiona el propio sacerdote
create policy availability_rules_select on public.availability_rules for select to anon, authenticated using (true);
create policy availability_rules_insert on public.availability_rules for insert to authenticated with check (priest_id = auth.uid());
create policy availability_rules_update on public.availability_rules for update to authenticated
  using (priest_id = auth.uid()) with check (priest_id = auth.uid());
create policy availability_rules_delete on public.availability_rules for delete to authenticated using (priest_id = auth.uid());

-- absences: privadas del sacerdote (los huecos se calculan con security definer)
create policy absences_all on public.absences for all to authenticated
  using (priest_id = auth.uid()) with check (priest_id = auth.uid());

-- appointments: solo el sacerdote (y admin). Nunca lectura anónima: se reserva/cancela por RPC.
create policy appointments_select on public.appointments for select to authenticated
  using (priest_id = auth.uid() or public.is_admin());
create policy appointments_update on public.appointments for update to authenticated
  using (priest_id = auth.uid()) with check (priest_id = auth.uid());

-- =====================================================================
-- GRANTs (sin esto la app da "permission denied" aunque haya políticas)
-- =====================================================================
grant usage on schema public to anon, authenticated;
grant select on public.priests, public.places, public.priest_places, public.availability_rules to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on function public.search_priests to anon, authenticated;
grant execute on function public.priest_free_slots to anon, authenticated;
grant execute on function public.book_appointment to anon, authenticated;
grant execute on function public.get_appointment_by_token to anon, authenticated;
grant execute on function public.cancel_appointment to anon, authenticated;
grant execute on function public.is_admin to authenticated;
revoke execute on function public.handle_new_user from public, anon, authenticated;
revoke execute on function public.priests_guard_status from public, anon, authenticated;
