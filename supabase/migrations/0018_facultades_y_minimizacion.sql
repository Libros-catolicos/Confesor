-- =====================================================================
-- Revisión de un sacerdote consultor (2026-09-24):
--  1. El sacerdote puede pausar su ficha él mismo, de inmediato (p. ej. si le
--     suspenden temporalmente las facultades para confesar, o por enfermedad).
--  2. Recordatorio periódico para repasar los horarios (no las facultades).
--  3. Minimización: del registro de confesiones solo queda la última fecha, y
--     las citas pasadas se borran del todo a los 7 días (antes, las de cuentas
--     de fiel se conservaban anonimizadas y dejaban rastro de fechas).
-- =====================================================================

-- ---------- 1. Pausa de la ficha, en manos del sacerdote ----------
alter table public.priests
  add column if not exists paused boolean not null default false,
  add column if not exists schedules_confirmed_at timestamptz,
  add column if not exists schedules_reminded_at timestamptz;

-- Una ficha está publicada si está verificada y no pausada
drop policy if exists priests_select on public.priests;
create policy priests_select on public.priests for select to anon, authenticated
  using ((status = 'verificado' and not paused) or id = auth.uid() or public.is_admin());

-- Firma real en producción (el orden de parámetros cambió en una migración posterior a 0004)
create or replace function public.search_priests(
  p_lat double precision, p_lng double precision, p_radius_km double precision default 25,
  p_languages text[] default null, p_from timestamptz default now(),
  p_to timestamptz default (now() + interval '14 days'), p_type public.slot_type default null
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
  where p.status = 'verificado' and not p.paused
    and st_dwithin(pl.location, o.g, least(p_radius_km, 200) * 1000)
    and (p_languages is null or p.languages && p_languages)
  group by p.id, pl.id, o.g
  order by distance_km;
$$;
grant execute on function public.search_priests(double precision, double precision, double precision, text[], timestamptz, timestamptz, public.slot_type) to anon, authenticated;

-- El sacerdote confirma que sus horarios siguen al día
create or replace function public.confirmar_horarios()
returns void
language plpgsql security invoker set search_path = public as $$
begin
  update public.priests
  set schedules_confirmed_at = now(), schedules_reminded_at = null
  where id = auth.uid();
end $$;
grant execute on function public.confirmar_horarios to authenticated;

-- ---------- 2. Última confesión: una sola fecha, no un historial ----------
alter table public.profiles add column if not exists last_confession_on date;

update public.profiles p
set last_confession_on = (select max(c.confessed_on) from public.confessions c where c.user_id = p.id)
where exists (select 1 from public.confessions c where c.user_id = p.id);

drop table if exists public.confessions;

create or replace function public.last_confession()
returns date
language sql stable security invoker set search_path = public as $$
  select last_confession_on from public.profiles where id = auth.uid();
$$;
grant execute on function public.last_confession to authenticated;

-- ---------- 3. Reserva: no se puede reservar con una ficha pausada ----------
create or replace function public.book_appointment(
  p_priest_id uuid, p_place_id uuid, p_starts_at timestamptz, p_type public.slot_type,
  p_language text, p_guest_name text, p_guest_email text,
  p_for_minor boolean default false, p_reminder boolean default false
)
returns table (appointment_id uuid, manage_token uuid, ends_at timestamptz, status public.appointment_status)
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_slot record;
  v_priest record;
  v_status public.appointment_status;
  v_id uuid;
  v_token uuid;
  v_user uuid := auth.uid();
  v_email text := nullif(lower(trim(p_guest_email)), '');
begin
  if coalesce(trim(p_guest_name), '') = '' then raise exception 'El nombre es obligatorio'; end if;
  if v_email is null or v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then raise exception 'Indica un email válido'; end if;

  select pr.* into v_priest from public.priests pr
  where pr.id = p_priest_id and pr.status = 'verificado' and not pr.paused;
  if not found then raise exception 'Sacerdote no disponible'; end if;
  if not (p_language = any (v_priest.languages)) then raise exception 'El sacerdote no atiende en ese idioma'; end if;

  if v_user is not null and not exists (select 1 from public.profiles where id = v_user and role = 'fiel') then
    v_user := null;
  end if;

  if (select count(*) from public.appointments a
      where a.priest_id = p_priest_id and a.status in ('pendiente', 'confirmada') and a.guest_email = v_email) >= 3 then
    raise exception 'Ya tienes varias citas pendientes con este sacerdote';
  end if;

  select s.* into v_slot
  from public.priest_free_slots(p_priest_id, (p_starts_at at time zone 'UTC')::date - 1, (p_starts_at at time zone 'UTC')::date + 1) s
  where s.place_id = p_place_id and s.starts_at = p_starts_at and s.type = p_type
  limit 1;
  if not found then raise exception 'Ese hueco ya no está disponible'; end if;

  v_status := case when v_priest.auto_confirm then 'confirmada' else 'pendiente' end::public.appointment_status;

  insert into public.appointments (
    priest_id, place_id, starts_at, ends_at, type, language, status,
    guest_name, guest_email, user_id, for_minor, reminder_opt_in
  )
  values (
    p_priest_id, p_place_id, p_starts_at, v_slot.ends_at, p_type, p_language, v_status,
    trim(p_guest_name), v_email, v_user, coalesce(p_for_minor, false), coalesce(p_reminder, false)
  )
  returning id, appointments.manage_token into v_id, v_token;

  return query select v_id, v_token, v_slot.ends_at, v_status;
end $$;
grant execute on function public.book_appointment to anon, authenticated;

-- ---------- 4. Purga a los 7 días: ahora se borran todas las citas ----------
-- Antes, las citas de quien tiene cuenta se conservaban anonimizadas y dejaban
-- un rastro de fechas de confesión. Ahora se guarda solo la última fecha.
create or replace function public.purge_appointments()
returns table (deleted integer, anonymized integer)
language plpgsql security definer set search_path = public as $$
declare
  v_limit timestamptz := now() - interval '7 days';
begin
  -- La última confesión del fiel se conserva como una sola fecha en su perfil
  with ultimas as (
    select a.user_id, max((a.ends_at at time zone pl.timezone)::date) as fecha
    from public.appointments a
    join public.places pl on pl.id = a.place_id
    where a.user_id is not null and a.ends_at < v_limit
      and a.type = 'confesion' and a.status in ('confirmada', 'completada')
    group by a.user_id
  )
  update public.profiles p
  set last_confession_on = greatest(coalesce(p.last_confession_on, u.fecha), u.fecha)
  from ultimas u
  where p.id = u.user_id;

  with d as (
    delete from public.appointments where ends_at < v_limit returning 1
  )
  select count(*)::int into deleted from d;

  anonymized := 0;
  return next;
end $$;
revoke all on function public.purge_appointments() from public, anon, authenticated;
grant execute on function public.purge_appointments() to service_role;

-- Ya no hay citas anonimizadas: sobra la marca de purga
alter table public.appointments drop constraint if exists appointments_contact_check;
alter table public.appointments drop column if exists purged_at;
alter table public.appointments add constraint appointments_contact_check
  check (guest_email is not null or guest_name = 'Cuenta eliminada');
