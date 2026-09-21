-- =====================================================================
-- Reserva solo con email; el sacerdote no ve ningún dato de contacto del fiel
-- (bloqueo a nivel de columna); aviso "ya estoy aquí".
-- =====================================================================

-- ---------- Fuera el teléfono ----------
alter table public.appointments drop constraint if exists appointments_contact_check;
alter table public.appointments drop column guest_phone;
alter table public.appointments add constraint appointments_contact_check
  check (guest_email is not null or guest_name = 'Cuenta eliminada');

-- ---------- "Ya estoy aquí" ----------
alter table public.appointments add column arrived_at timestamptz;

-- ---------- Nadie con sesión (sacerdote, fiel, admin) puede leer el email del fiel en appointments.
-- El servidor usa la clave de servicio para enviar correos. ----------
revoke select on public.appointments from authenticated;
grant select (
  id, priest_id, place_id, starts_at, ends_at, type, language, status, guest_name, manage_token,
  cancelled_by, cancel_message, proposed_starts_at, proposed_ends_at, user_id, reminder_sent_at,
  for_minor, reminder_opt_in, arrived_at, created_at, updated_at
) on public.appointments to authenticated;

-- ---------- book_appointment: email obligatorio, sin teléfono ----------
drop function public.book_appointment(uuid, uuid, timestamptz, public.slot_type, text, text, text, text, boolean, boolean);
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
  v_user uuid := auth.uid();
  v_email text := nullif(lower(trim(p_guest_email)), '');
begin
  if coalesce(trim(p_guest_name), '') = '' then raise exception 'El nombre es obligatorio'; end if;
  if v_email is null or v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then raise exception 'Indica un email válido'; end if;

  select pr.* into v_priest from public.priests pr where pr.id = p_priest_id and pr.status = 'verificado';
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

  return query
    insert into public.appointments as a
      (priest_id, place_id, starts_at, ends_at, type, language, guest_name, guest_email, status, user_id, for_minor, reminder_opt_in)
    values
      (p_priest_id, p_place_id, v_slot.starts_at, v_slot.ends_at, p_type, p_language, trim(p_guest_name), v_email,
       case when v_priest.auto_confirm then 'confirmada' else 'pendiente' end::public.appointment_status,
       v_user, coalesce(p_for_minor, false), coalesce(p_reminder, false))
    returning a.id, a.manage_token, a.ends_at, a.status;
end $$;
grant execute on function public.book_appointment to anon, authenticated;

-- ---------- priest_cancel_appointment: sin select * (la columna guest_email ya no es legible) ----------
create or replace function public.priest_cancel_appointment(
  p_appointment_id uuid, p_message text default null, p_new_starts_at timestamptz default null
)
returns boolean
language plpgsql security invoker set search_path = public, extensions as $$
declare
  v_ap record;
  v_slot record;
begin
  select id, priest_id, place_id, status into v_ap from public.appointments
  where id = p_appointment_id and priest_id = auth.uid() and status in ('pendiente', 'confirmada');
  if not found then raise exception 'Cita no encontrada'; end if;

  if p_new_starts_at is null then
    update public.appointments
    set status = 'cancelada', cancelled_by = 'sacerdote', cancel_message = nullif(trim(p_message), '')
    where id = v_ap.id;
    return true;
  end if;

  select s.* into v_slot
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

-- ---------- Feed iCal: solo nombre ----------
drop function public.calendar_feed(uuid);
create or replace function public.calendar_feed(p_token uuid)
returns table (
  id uuid, starts_at timestamptz, ends_at timestamptz, type public.slot_type, status public.appointment_status,
  guest_name text, language text, arrived_at timestamptz, updated_at timestamptz,
  place_name text, address text, city text
)
language sql stable security definer set search_path = public as $$
  select a.id, a.starts_at, a.ends_at, a.type, a.status, a.guest_name, a.language, a.arrived_at, a.updated_at,
         pl.name, pl.address, pl.city
  from public.priest_private pp
  join public.appointments a on a.priest_id = pp.priest_id
  join public.places pl on pl.id = a.place_id
  where pp.calendar_token = p_token
    and a.status in ('pendiente', 'confirmada', 'completada')
    and a.starts_at > now() - interval '7 days'
  order by a.starts_at;
$$;
grant execute on function public.calendar_feed to anon, authenticated;

-- ---------- get_appointment_notification: sin datos de contacto (el servidor usa la clave de servicio) ----------
drop function public.get_appointment_notification(uuid);
create or replace function public.get_appointment_notification(p_token uuid)
returns table (
  id uuid, status public.appointment_status, type public.slot_type, language text,
  starts_at timestamptz, ends_at timestamptz, guest_name text, arrived_at timestamptz,
  manage_token uuid, priest_token uuid,
  priest_name text, priest_slug text, place_name text, address text, city text, timezone text
)
language sql stable security definer set search_path = public as $$
  select a.id, a.status, a.type, a.language, a.starts_at, a.ends_at, a.guest_name, a.arrived_at,
         a.manage_token, a.priest_token,
         p.display_name, p.slug, pl.name, pl.address, pl.city, pl.timezone
  from public.appointments a
  join public.priests p on p.id = a.priest_id
  join public.places pl on pl.id = a.place_id
  where a.manage_token = p_token or a.priest_token = p_token;
$$;
grant execute on function public.get_appointment_notification to anon, authenticated;

-- ---------- "Ya estoy aquí": desde 1 h antes hasta el fin de la cita, una sola vez ----------
create or replace function public.mark_arrived(p_token uuid)
returns boolean
language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  update public.appointments set arrived_at = now()
  where manage_token = p_token and arrived_at is null
    and status in ('pendiente', 'confirmada')
    and now() between starts_at - interval '1 hour' and ends_at;
  get diagnostics v_count = row_count;
  return v_count > 0;
end $$;
grant execute on function public.mark_arrived to anon, authenticated;

-- get_appointment_by_token: has_email ya no aplica (siempre hay email); añadir arrived_at
drop function public.get_appointment_by_token(uuid);
create or replace function public.get_appointment_by_token(p_token uuid)
returns table (
  id uuid, starts_at timestamptz, ends_at timestamptz, type public.slot_type, language text,
  status public.appointment_status, guest_name text,
  cancelled_by text, cancel_message text, proposed_starts_at timestamptz, proposed_ends_at timestamptz,
  priest_name text, priest_slug text, place_name text, address text, city text, timezone text,
  reminder_opt_in boolean, arrived_at timestamptz
)
language sql stable security definer set search_path = public as $$
  select a.id, a.starts_at, a.ends_at, a.type, a.language, a.status, a.guest_name,
         a.cancelled_by, a.cancel_message, a.proposed_starts_at, a.proposed_ends_at,
         p.display_name, p.slug, pl.name, pl.address, pl.city, pl.timezone,
         a.reminder_opt_in, a.arrived_at
  from public.appointments a
  join public.priests p on p.id = a.priest_id
  join public.places pl on pl.id = a.place_id
  where a.manage_token = p_token;
$$;
grant execute on function public.get_appointment_by_token to anon, authenticated;

create or replace function public.set_reminder_by_token(p_token uuid, p_enabled boolean)
returns boolean
language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  update public.appointments set reminder_opt_in = p_enabled
  where manage_token = p_token and starts_at > now();
  get diagnostics v_count = row_count;
  return v_count > 0;
end $$;
