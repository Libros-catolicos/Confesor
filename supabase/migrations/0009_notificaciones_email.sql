-- =====================================================================
-- Soporte para notificaciones por email:
--  · token privado del sacerdote por cita (confirmar/rechazar desde el email sin login)
--  · RPC que devuelve los datos necesarios para redactar los emails
-- =====================================================================

alter table public.appointments
  add column priest_token uuid not null default gen_random_uuid() unique;

-- Datos de una cita para las notificaciones. Se accede con cualquiera de los
-- dos tokens (del fiel o del sacerdote), así el servidor puede redactar el
-- email sin clave de servicio. Incluye el email del sacerdote (privado) solo
-- porque quien llama ya posee un token secreto de esa cita.
create or replace function public.get_appointment_notification(p_token uuid)
returns table (
  id uuid, status public.appointment_status, type public.slot_type, language text,
  starts_at timestamptz, ends_at timestamptz,
  proposed_starts_at timestamptz, cancel_message text, cancelled_by text,
  guest_name text, guest_email text, guest_phone text,
  manage_token uuid, priest_token uuid,
  priest_name text, priest_email text, priest_slug text, auto_confirm boolean,
  place_name text, address text, city text, timezone text
)
language sql stable security definer set search_path = public as $$
  select a.id, a.status, a.type, a.language, a.starts_at, a.ends_at,
         a.proposed_starts_at, a.cancel_message, a.cancelled_by,
         a.guest_name, a.guest_email, a.guest_phone,
         a.manage_token, a.priest_token,
         p.display_name, pr.email, p.slug, p.auto_confirm,
         pl.name, pl.address, pl.city, pl.timezone
  from public.appointments a
  join public.priests p on p.id = a.priest_id
  join public.profiles pr on pr.id = a.priest_id
  join public.places pl on pl.id = a.place_id
  where a.manage_token = p_token or a.priest_token = p_token;
$$;

-- El sacerdote responde desde el email: confirmar o rechazar (cancelar).
create or replace function public.priest_respond_by_token(p_token uuid, p_action text, p_message text default null)
returns boolean
language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  if p_action = 'confirmar' then
    update public.appointments set status = 'confirmada'
    where priest_token = p_token and status = 'pendiente' and starts_at > now();
  elsif p_action = 'rechazar' then
    update public.appointments
    set status = 'cancelada', cancelled_by = 'sacerdote', cancel_message = nullif(trim(p_message), '')
    where priest_token = p_token and status in ('pendiente', 'confirmada') and starts_at > now();
  else
    raise exception 'Acción no válida';
  end if;
  get diagnostics v_count = row_count;
  return v_count > 0;
end $$;

grant execute on function public.get_appointment_notification to anon, authenticated;
grant execute on function public.priest_respond_by_token to anon, authenticated;
