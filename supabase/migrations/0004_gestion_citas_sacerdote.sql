-- =====================================================================
-- Gestión de citas por el sacerdote:
--  · antelación mínima de reserva y confirmación manual/automática
--  · cancelar proponiendo otra hora (estado 'reprogramar') y respuesta del fiel
--  · suscripción iCal privada del sacerdote (calendar_token)
-- =====================================================================

alter table public.priests
  add column min_notice_hours smallint not null default 0 check (min_notice_hours between 0 and 168),
  add column auto_confirm boolean not null default true,
  add column calendar_token uuid not null default gen_random_uuid() unique;

alter table public.appointments
  add column cancelled_by text check (cancelled_by in ('sacerdote', 'fiel')),
  add column cancel_message text,
  add column proposed_starts_at timestamptz,
  add column proposed_ends_at timestamptz;

-- ---------- Huecos libres: respetar la antelación mínima ----------
drop function public.priest_free_slots(uuid, date, date);
create or replace function public.priest_free_slots(
  p_priest_id uuid,
  p_from date,
  p_to date,
  p_apply_notice boolean default true   -- false: el propio sacerdote proponiendo hora
)
returns table (place_id uuid, starts_at timestamptz, ends_at timestamptz, type public.slot_type, slot_minutes smallint)
language sql stable security definer set search_path = public, extensions as $$
  with notice as (
    select case when p_apply_notice then coalesce(min_notice_hours, 0) else 0 end * interval '1 hour' as h
    from public.priests where id = p_priest_id
  ),
  days as (
    select d::date as day
    from generate_series(p_from, least(p_to, p_from + 60), interval '1 day') d
  ),
  candidate as (
    select
      r.place_id, r.type, r.slot_minutes, pl.timezone as tz, dy.day,
      ((dy.day + r.start_time)::timestamp at time zone pl.timezone) + (n * r.slot_minutes) * interval '1 minute' as starts_at,
      ((dy.day + r.start_time)::timestamp at time zone pl.timezone) + ((n + 1) * r.slot_minutes) * interval '1 minute' as ends_at
    from public.availability_rules r
    join public.places pl on pl.id = r.place_id
    join days dy on extract(isodow from dy.day) = r.weekday
    cross join lateral generate_series(
      0, floor(extract(epoch from (r.end_time - r.start_time)) / 60 / r.slot_minutes)::int - 1
    ) n
    where r.priest_id = p_priest_id and r.active
  )
  select c.place_id, c.starts_at, c.ends_at, c.type, c.slot_minutes
  from candidate c, notice
  where c.starts_at > now() + notice.h
    and not exists (
      select 1 from public.absences a
      where a.priest_id = p_priest_id and a.date = c.day
        and (a.start_time is null
             or tstzrange((a.date + a.start_time)::timestamp at time zone c.tz,
                          (a.date + a.end_time)::timestamp at time zone c.tz) && tstzrange(c.starts_at, c.ends_at))
    )
    and not exists (
      select 1 from public.appointments ap
      where ap.priest_id = p_priest_id
        and ap.status in ('pendiente', 'confirmada')
        and tstzrange(ap.starts_at, ap.ends_at) && tstzrange(c.starts_at, c.ends_at)
    )
  order by c.starts_at;
$$;
grant execute on function public.priest_free_slots to anon, authenticated;

-- search_priests dependía de la firma anterior: recrear
create or replace function public.search_priests(
  p_lat double precision, p_lng double precision, p_radius_km double precision default 25,
  p_languages text[] default null, p_from timestamptz default now(),
  p_to timestamptz default now() + interval '14 days', p_type public.slot_type default null
)
returns table (
  priest_id uuid, slug text, display_name text, photo_url text, languages text[],
  place_id uuid, place_name text, address text, city text,
  distance_km double precision, next_slot timestamptz, free_slots bigint
)
language sql stable security definer set search_path = public, extensions as $$
  with origin as (select st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography as g)
  select p.id, p.slug, p.display_name, p.photo_url, p.languages, pl.id, pl.name, pl.address, pl.city,
    st_distance(pl.location, o.g) / 1000 as distance_km, min(s.starts_at), count(s.starts_at)
  from public.priests p
  join public.priest_places pp on pp.priest_id = p.id
  join public.places pl on pl.id = pp.place_id
  cross join origin o
  left join lateral (
    select fs.starts_at
    from public.priest_free_slots(p.id, (p_from at time zone pl.timezone)::date, (p_to at time zone pl.timezone)::date) fs
    where fs.place_id = pl.id and fs.starts_at between p_from and p_to and (p_type is null or fs.type = p_type)
  ) s on true
  where p.status = 'verificado'
    and st_dwithin(pl.location, o.g, least(p_radius_km, 200) * 1000)
    and (p_languages is null or p.languages && p_languages)
  group by p.id, pl.id, o.g
  order by distance_km;
$$;

-- ---------- Reserva: estado inicial según auto_confirm ----------
drop function public.book_appointment(uuid, uuid, timestamptz, public.slot_type, text, text, text, text);
create or replace function public.book_appointment(
  p_priest_id uuid, p_place_id uuid, p_starts_at timestamptz, p_type public.slot_type,
  p_language text, p_guest_name text, p_guest_email text default null, p_guest_phone text default null
)
returns table (appointment_id uuid, manage_token uuid, ends_at timestamptz, status public.appointment_status)
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_slot record;
  v_priest record;
begin
  if coalesce(trim(p_guest_name), '') = '' then raise exception 'El nombre es obligatorio'; end if;
  if coalesce(trim(p_guest_email), '') = '' and coalesce(trim(p_guest_phone), '') = '' then
    raise exception 'Indica un email o un teléfono de contacto';
  end if;

  select * into v_priest from public.priests where id = p_priest_id and status = 'verificado';
  if not found then raise exception 'Sacerdote no disponible'; end if;
  if not (p_language = any (v_priest.languages)) then raise exception 'El sacerdote no atiende en ese idioma'; end if;

  -- Antispam básico: máximo 3 citas activas por contacto y sacerdote
  if (select count(*) from public.appointments a
      where a.priest_id = p_priest_id and a.status in ('pendiente', 'confirmada')
        and ((p_guest_email is not null and a.guest_email = lower(trim(p_guest_email)))
          or (p_guest_phone is not null and a.guest_phone = regexp_replace(p_guest_phone, '\s', '', 'g')))) >= 3 then
    raise exception 'Ya tienes varias citas pendientes con este sacerdote';
  end if;

  select * into v_slot
  from public.priest_free_slots(p_priest_id, (p_starts_at at time zone 'UTC')::date - 1, (p_starts_at at time zone 'UTC')::date + 1) s
  where s.place_id = p_place_id and s.starts_at = p_starts_at and s.type = p_type
  limit 1;
  if not found then raise exception 'Ese hueco ya no está disponible'; end if;

  return query
    insert into public.appointments
      (priest_id, place_id, starts_at, ends_at, type, language, guest_name, guest_email, guest_phone, status)
    values
      (p_priest_id, p_place_id, v_slot.starts_at, v_slot.ends_at, p_type, p_language, trim(p_guest_name),
       nullif(lower(trim(p_guest_email)), ''), nullif(regexp_replace(p_guest_phone, '\s', '', 'g'), ''),
       case when v_priest.auto_confirm then 'confirmada' else 'pendiente' end::public.appointment_status)
    returning id, appointments.manage_token, appointments.ends_at, appointments.status;
end $$;

-- ---------- Consulta por token: incluir la propuesta ----------
drop function public.get_appointment_by_token(uuid);
create or replace function public.get_appointment_by_token(p_token uuid)
returns table (
  id uuid, starts_at timestamptz, ends_at timestamptz, type public.slot_type, language text,
  status public.appointment_status, guest_name text,
  cancelled_by text, cancel_message text, proposed_starts_at timestamptz, proposed_ends_at timestamptz,
  priest_name text, priest_slug text, place_name text, address text, city text, timezone text
)
language sql stable security definer set search_path = public as $$
  select a.id, a.starts_at, a.ends_at, a.type, a.language, a.status, a.guest_name,
         a.cancelled_by, a.cancel_message, a.proposed_starts_at, a.proposed_ends_at,
         p.display_name, p.slug, pl.name, pl.address, pl.city, pl.timezone
  from public.appointments a
  join public.priests p on p.id = a.priest_id
  join public.places pl on pl.id = a.place_id
  where a.manage_token = p_token;
$$;
grant execute on function public.get_appointment_by_token to anon, authenticated;

-- ---------- Cancelación por el fiel (también rechaza una propuesta) ----------
create or replace function public.cancel_appointment(p_token uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  update public.appointments
  set status = 'cancelada', cancelled_by = 'fiel'
  where manage_token = p_token
    and status in ('pendiente', 'confirmada', 'reprogramar')
    and (status = 'reprogramar' or starts_at > now());
  get diagnostics v_count = row_count;
  return v_count > 0;
end $$;

-- ---------- El fiel acepta la hora propuesta ----------
create or replace function public.accept_proposed_time(p_token uuid)
returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_ap record;
  v_slot record;
begin
  select * into v_ap from public.appointments where manage_token = p_token and status = 'reprogramar';
  if not found then return false; end if;

  select * into v_slot
  from public.priest_free_slots(v_ap.priest_id, (v_ap.proposed_starts_at at time zone 'UTC')::date - 1,
                                (v_ap.proposed_starts_at at time zone 'UTC')::date + 1, false) s
  where s.place_id = v_ap.place_id and s.starts_at = v_ap.proposed_starts_at
  limit 1;
  if not found then
    raise exception 'La hora propuesta ya no está disponible';
  end if;

  update public.appointments
  set starts_at = v_ap.proposed_starts_at, ends_at = v_ap.proposed_ends_at, type = v_slot.type,
      status = 'confirmada', proposed_starts_at = null, proposed_ends_at = null,
      cancelled_by = null, cancel_message = null
  where id = v_ap.id;
  return true;
end $$;

-- ---------- El sacerdote cancela proponiendo otra hora (o sin proponer) ----------
create or replace function public.priest_cancel_appointment(
  p_appointment_id uuid, p_message text default null, p_new_starts_at timestamptz default null
)
returns boolean
language plpgsql security invoker set search_path = public, extensions as $$
declare
  v_ap record;
  v_slot record;
begin
  select * into v_ap from public.appointments
  where id = p_appointment_id and priest_id = auth.uid() and status in ('pendiente', 'confirmada');
  if not found then raise exception 'Cita no encontrada'; end if;

  if p_new_starts_at is null then
    update public.appointments
    set status = 'cancelada', cancelled_by = 'sacerdote', cancel_message = nullif(trim(p_message), '')
    where id = v_ap.id;
    return true;
  end if;

  select * into v_slot
  from public.priest_free_slots(v_ap.priest_id, (p_new_starts_at at time zone 'UTC')::date - 1,
                                (p_new_starts_at at time zone 'UTC')::date + 1, false) s
  where s.place_id = v_ap.place_id and s.starts_at = p_new_starts_at
  limit 1;
  if not found then raise exception 'La hora propuesta no está libre'; end if;

  update public.appointments
  set status = 'reprogramar', cancelled_by = 'sacerdote', cancel_message = nullif(trim(p_message), ''),
      proposed_starts_at = v_slot.starts_at, proposed_ends_at = v_slot.ends_at
  where id = v_ap.id;
  return true;
end $$;

-- ---------- Feed iCal privado del sacerdote ----------
create or replace function public.calendar_feed(p_token uuid)
returns table (
  id uuid, starts_at timestamptz, ends_at timestamptz, type public.slot_type, status public.appointment_status,
  guest_name text, guest_email text, guest_phone text, language text, updated_at timestamptz,
  place_name text, address text, city text
)
language sql stable security definer set search_path = public as $$
  select a.id, a.starts_at, a.ends_at, a.type, a.status, a.guest_name, a.guest_email, a.guest_phone,
         a.language, a.updated_at, pl.name, pl.address, pl.city
  from public.priests p
  join public.appointments a on a.priest_id = p.id
  join public.places pl on pl.id = a.place_id
  where p.calendar_token = p_token
    and a.status in ('pendiente', 'confirmada', 'completada')
    and a.starts_at > now() - interval '30 days'
  order by a.starts_at;
$$;

grant execute on function public.book_appointment to anon, authenticated;
grant execute on function public.accept_proposed_time to anon, authenticated;
grant execute on function public.priest_cancel_appointment to authenticated;
grant execute on function public.calendar_feed to anon, authenticated;
