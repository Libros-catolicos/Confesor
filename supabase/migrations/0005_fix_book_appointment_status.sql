-- El parámetro de salida "status" hacía ambigua la referencia a la columna en book_appointment.
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

  select pr.* into v_priest from public.priests pr where pr.id = p_priest_id and pr.status = 'verificado';
  if not found then raise exception 'Sacerdote no disponible'; end if;
  if not (p_language = any (v_priest.languages)) then raise exception 'El sacerdote no atiende en ese idioma'; end if;

  -- Antispam básico: máximo 3 citas activas por contacto y sacerdote
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
      (priest_id, place_id, starts_at, ends_at, type, language, guest_name, guest_email, guest_phone, status)
    values
      (p_priest_id, p_place_id, v_slot.starts_at, v_slot.ends_at, p_type, p_language, trim(p_guest_name),
       nullif(lower(trim(p_guest_email)), ''), nullif(regexp_replace(p_guest_phone, '\s', '', 'g'), ''),
       case when v_priest.auto_confirm then 'confirmada' else 'pendiente' end::public.appointment_status)
    returning a.id, a.manage_token, a.ends_at, a.status;
end $$;
