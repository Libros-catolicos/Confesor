-- =====================================================================
-- Borrado de reservas 7 días después de la cita (política de privacidad §2)
-- y caducidad de los enlaces. Lo ejecuta el cron diario con la clave de servicio.
--
--  · Reserva sin cuenta: se borra entera (con ella mueren los dos enlaces).
--  · Reserva ligada a una cuenta de fiel: queda solo la fecha, el tipo y el
--    lugar (su historial); se quitan email, nombre y se rotan los tokens.
--  · El sacerdote deja de ver cualquier cita a los 7 días (RLS), aunque el
--    cron fallara un día.
-- =====================================================================

alter table public.appointments add column if not exists purged_at timestamptz;

alter table public.appointments drop constraint if exists appointments_contact_check;
alter table public.appointments add constraint appointments_contact_check
  check (guest_email is not null or guest_name = 'Cuenta eliminada' or purged_at is not null);

create or replace function public.purge_appointments()
returns table (deleted integer, anonymized integer)
language plpgsql security definer set search_path = public as $$
declare
  v_limit timestamptz := now() - interval '7 days';
begin
  with d as (
    delete from public.appointments
    where user_id is null and ends_at < v_limit
    returning 1
  )
  select count(*)::int into deleted from d;

  with u as (
    update public.appointments
    set guest_email = null,
        guest_name = 'Fiel',
        cancel_message = null,
        manage_token = gen_random_uuid(),
        priest_token = gen_random_uuid(),
        purged_at = now()
    where user_id is not null and ends_at < v_limit and purged_at is null
    returning 1
  )
  select count(*)::int into anonymized from u;

  return next;
end $$;
revoke all on function public.purge_appointments() from public, anon, authenticated;
grant execute on function public.purge_appointments() to service_role;

-- El sacerdote solo ve citas hasta 7 días después de su fin
drop policy if exists appointments_select on public.appointments;
create policy appointments_select on public.appointments for select to authenticated
  using ((priest_id = auth.uid() and ends_at > now() - interval '7 days') or public.is_admin());
drop policy if exists appointments_update on public.appointments;
create policy appointments_update on public.appointments for update to authenticated
  using (priest_id = auth.uid() and ends_at > now() - interval '7 days')
  with check (priest_id = auth.uid());

-- delete_my_account aún escribía guest_phone (columna eliminada en 0014)
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
      guest_email = null, guest_name = 'Cuenta eliminada'
  where user_id = auth.uid();
  delete from auth.users where id = auth.uid();
end $$;
