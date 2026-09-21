-- =====================================================================
-- Cuenta opcional de fiel: citas ligadas a la cuenta, registro de fechas de
-- confesión (solo fechas, nunca contenido), avisos y borrado de cuenta.
-- =====================================================================

-- ---------- Preferencias de avisos (en profiles, para cualquier rol) ----------
alter table public.profiles
  add column notify_appointments boolean not null default true,   -- recordatorio el día antes
  add column reminder_days smallint not null default 0             -- 0 = sin aviso; 30/60/90 días sin confesarse
    check (reminder_days in (0, 30, 60, 90, 180)),
  add column last_nudge_at timestamptz;

-- ---------- Citas ligadas a la cuenta del fiel ----------
-- Al borrar la cuenta se anonimiza el contacto: el check original ya no aplica en ese caso
alter table public.appointments drop constraint appointments_check1;
alter table public.appointments add constraint appointments_contact_check
  check (guest_email is not null or guest_phone is not null or guest_name = 'Cuenta eliminada');
alter table public.appointments
  add column user_id uuid references auth.users(id) on delete set null,
  add column reminder_sent_at timestamptz;
create index appointments_user_idx on public.appointments (user_id) where user_id is not null;

-- ---------- Registro de confesiones sin cita (solo la fecha) ----------
create table public.confessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  confessed_on date not null,
  created_at timestamptz not null default now(),
  unique (user_id, confessed_on)
);
alter table public.confessions enable row level security;
create policy confessions_own on public.confessions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, delete on public.confessions to authenticated;

-- El fiel ve sus propias citas (para gestionarlas usa los enlaces con token)
create policy appointments_select_own on public.appointments for select to authenticated
  using (user_id = auth.uid());

-- ---------- Alta: sacerdote (por defecto) o fiel según metadata.role ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare
  v_name text := coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1));
  v_role text := coalesce(new.raw_user_meta_data ->> 'role', 'sacerdote');
  v_slug text;
begin
  if v_role = 'fiel' then
    insert into public.profiles (id, role, full_name, email) values (new.id, 'fiel', v_name, new.email);
    return new;
  end if;

  insert into public.profiles (id, full_name, email) values (new.id, v_name, new.email);

  v_slug := regexp_replace(lower(unaccent(v_name)), '[^a-z0-9]+', '-', 'g');
  v_slug := trim(both '-' from v_slug) || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 6);

  insert into public.priests (id, slug, display_name, languages)
  values (
    new.id, v_slug, v_name,
    coalesce((select array_agg(x) from jsonb_array_elements_text(new.raw_user_meta_data -> 'languages') x), '{es}')
  );
  insert into public.priest_private (priest_id) values (new.id);
  return new;
end $$;

-- ---------- Reserva: si hay sesión de fiel, la cita queda ligada a la cuenta ----------
create or replace function public.book_appointment(
  p_priest_id uuid, p_place_id uuid, p_starts_at timestamptz, p_type public.slot_type,
  p_language text, p_guest_name text, p_guest_email text default null, p_guest_phone text default null
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

  -- Solo los fieles quedan ligados; un sacerdote o admin reservando como fiel no
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
      (priest_id, place_id, starts_at, ends_at, type, language, guest_name, guest_email, guest_phone, status, user_id)
    values
      (p_priest_id, p_place_id, v_slot.starts_at, v_slot.ends_at, p_type, p_language, trim(p_guest_name),
       nullif(lower(trim(p_guest_email)), ''), nullif(regexp_replace(p_guest_phone, '\s', '', 'g'), ''),
       case when v_priest.auto_confirm then 'confirmada' else 'pendiente' end::public.appointment_status,
       v_user)
    returning a.id, a.manage_token, a.ends_at, a.status;
end $$;

-- ---------- Última confesión del fiel: citas de confesión pasadas no canceladas + registro manual ----------
create or replace function public.last_confession()
returns date
language sql stable security invoker set search_path = public as $$
  select max(d) from (
    select confessed_on as d from public.confessions where user_id = auth.uid()
    union all
    select (a.ends_at at time zone pl.timezone)::date
    from public.appointments a join public.places pl on pl.id = a.place_id
    where a.user_id = auth.uid() and a.type = 'confesion' and a.ends_at < now()
      and a.status in ('confirmada', 'completada')
  ) t;
$$;
grant execute on function public.last_confession to authenticated;

-- ---------- Borrar la cuenta (derecho de supresión): elimina el usuario y, en cascada, todo ----------
create or replace function public.delete_my_account()
returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then raise exception 'Sin sesión'; end if;
  -- Las citas futuras se cancelan (liberan el hueco) y se anonimizan; las pasadas
  -- pierden el contacto. Nada queda ligado a la persona.
  update public.appointments
  set status = case when starts_at > now() and status in ('pendiente', 'confirmada', 'reprogramar') then 'cancelada' else status end,
      cancelled_by = case when starts_at > now() and status in ('pendiente', 'confirmada', 'reprogramar') then 'fiel' else cancelled_by end,
      guest_email = null, guest_phone = null, guest_name = 'Cuenta eliminada'
  where user_id = auth.uid();
  delete from auth.users where id = auth.uid();
end $$;
grant execute on function public.delete_my_account to authenticated;
