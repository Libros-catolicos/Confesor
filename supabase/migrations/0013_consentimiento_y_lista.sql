-- =====================================================================
-- Fase legal 1: prueba del consentimiento, lista de correo, recordatorios
-- opt-in, indicador de menor, afiliación en libros, límite del contacto.
-- =====================================================================

-- ---------- consent_log: solo inserción, sin acceso de cliente (solo service_role) ----------
create table public.consent_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  subject_type text not null check (subject_type in ('booking', 'faithful', 'priest', 'newsletter')),
  subject_id uuid,
  email_hash text not null,                        -- sha256(email en minúsculas + sal de servidor)
  consent_kind text not null check (consent_kind in ('service', 'newsletter', 'minor_guardian', 'reminders')),
  legal_version text not null,
  consent_text text not null,                      -- texto literal mostrado al usuario
  action text not null check (action in ('granted', 'withdrawn'))
);
create index consent_log_email_idx on public.consent_log (email_hash, created_at);
alter table public.consent_log enable row level security;
-- Sin políticas: ningún rol de cliente puede leer ni escribir. service_role salta RLS.
revoke all on public.consent_log from anon, authenticated;

-- ---------- newsletter_subscribers: independiente de reservas y cuentas ----------
create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text,                                      -- null tras la baja (fila anonimizada)
  name text,
  source text not null check (source in ('booking', 'faithful', 'priest')),
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz,
  unsubscribe_token_hash text not null unique
);
create unique index newsletter_subscribers_email_activo on public.newsletter_subscribers (lower(email))
  where email is not null and unsubscribed_at is null;
alter table public.newsletter_subscribers enable row level security;
revoke all on public.newsletter_subscribers from anon, authenticated;

-- ---------- Límite de intentos del formulario de contacto (solo hash + fecha) ----------
create table public.contact_attempts (
  id uuid primary key default gen_random_uuid(),
  email_hash text not null,
  created_at timestamptz not null default now()
);
create index contact_attempts_idx on public.contact_attempts (email_hash, created_at);
alter table public.contact_attempts enable row level security;
revoke all on public.contact_attempts from anon, authenticated;

-- ---------- Reservas: menor a cargo y recordatorio opt-in ----------
alter table public.appointments
  add column for_minor boolean not null default false,
  add column reminder_opt_in boolean not null default false;

-- ---------- Recordatorio de cuenta: desactivado por defecto ----------
alter table public.profiles alter column notify_appointments set default false;
update public.profiles set notify_appointments = false;

-- ---------- Libros: enlace de afiliado ----------
alter table public.books add column affiliate boolean not null default false;

-- ---------- Reserva: recibe los nuevos indicadores ----------
drop function public.book_appointment(uuid, uuid, timestamptz, public.slot_type, text, text, text, text);
create or replace function public.book_appointment(
  p_priest_id uuid, p_place_id uuid, p_starts_at timestamptz, p_type public.slot_type,
  p_language text, p_guest_name text, p_guest_email text default null, p_guest_phone text default null,
  p_for_minor boolean default false, p_reminder boolean default false
)
returns table (appointment_id uuid, manage_token uuid, ends_at timestamptz, status public.appointment_status)
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_slot record;
  v_priest record;
  v_user uuid := auth.uid();
begin
  if coalesce(trim(p_guest_name), '') = '' then raise exception 'El nombre es obligatorio'; end if;
  if coalesce(trim(p_guest_email), '') = '' and coalesce(trim(p_guest_phone), '') = '' then
    raise exception 'Indica un email o un teléfono de contacto';
  end if;

  select pr.* into v_priest from public.priests pr where pr.id = p_priest_id and pr.status = 'verificado';
  if not found then raise exception 'Sacerdote no disponible'; end if;
  if not (p_language = any (v_priest.languages)) then raise exception 'El sacerdote no atiende en ese idioma'; end if;

  if v_user is not null and not exists (select 1 from public.profiles where id = v_user and role = 'fiel') then
    v_user := null;
  end if;

  if (select count(*) from public.appointments a
      where a.priest_id = p_priest_id and a.status in ('pendiente', 'confirmada')
        and ((p_guest_email is not null and a.guest_email = lower(trim(p_guest_email)))
          or (p_guest_phone is not null and a.guest_phone = regexp_replace(p_guest_phone, '\s', '', 'g')))) >= 3 then
    raise exception 'Ya tienes varias citas pendientes con este sacerdote';
  end if;

  select s.* into v_slot
  from public.priest_free_slots(p_priest_id, (p_starts_at at time zone 'UTC')::date - 1, (p_starts_at at time zone 'UTC')::date + 1) s
  where s.place_id = p_place_id and s.starts_at = p_starts_at and s.type = p_type
  limit 1;
  if not found then raise exception 'Ese hueco ya no está disponible'; end if;

  return query
    insert into public.appointments as a
      (priest_id, place_id, starts_at, ends_at, type, language, guest_name, guest_email, guest_phone, status, user_id, for_minor, reminder_opt_in)
    values
      (p_priest_id, p_place_id, v_slot.starts_at, v_slot.ends_at, p_type, p_language, trim(p_guest_name),
       nullif(lower(trim(p_guest_email)), ''), nullif(regexp_replace(p_guest_phone, '\s', '', 'g'), ''),
       case when v_priest.auto_confirm then 'confirmada' else 'pendiente' end::public.appointment_status,
       v_user, coalesce(p_for_minor, false), coalesce(p_reminder, false) and p_guest_email is not null)
    returning a.id, a.manage_token, a.ends_at, a.status;
end $$;
grant execute on function public.book_appointment to anon, authenticated;

-- ---------- El fiel activa/desactiva el recordatorio de su cita desde su enlace ----------
create or replace function public.set_reminder_by_token(p_token uuid, p_enabled boolean)
returns boolean
language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  update public.appointments set reminder_opt_in = p_enabled and guest_email is not null
  where manage_token = p_token and starts_at > now();
  get diagnostics v_count = row_count;
  return v_count > 0;
end $$;
grant execute on function public.set_reminder_by_token to anon, authenticated;

-- get_appointment_by_token: exponer reminder_opt_in y for_minor
drop function public.get_appointment_by_token(uuid);
create or replace function public.get_appointment_by_token(p_token uuid)
returns table (
  id uuid, starts_at timestamptz, ends_at timestamptz, type public.slot_type, language text,
  status public.appointment_status, guest_name text,
  cancelled_by text, cancel_message text, proposed_starts_at timestamptz, proposed_ends_at timestamptz,
  priest_name text, priest_slug text, place_name text, address text, city text, timezone text,
  reminder_opt_in boolean, has_email boolean
)
language sql stable security definer set search_path = public as $$
  select a.id, a.starts_at, a.ends_at, a.type, a.language, a.status, a.guest_name,
         a.cancelled_by, a.cancel_message, a.proposed_starts_at, a.proposed_ends_at,
         p.display_name, p.slug, pl.name, pl.address, pl.city, pl.timezone,
         a.reminder_opt_in, a.guest_email is not null
  from public.appointments a
  join public.priests p on p.id = a.priest_id
  join public.places pl on pl.id = a.place_id
  where a.manage_token = p_token;
$$;
grant execute on function public.get_appointment_by_token to anon, authenticated;
