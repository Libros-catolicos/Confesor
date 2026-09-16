-- El guard de priests.status debe dejar pasar al rol de servicio / SQL Editor
-- (auth.uid() es null ahí). Los anónimos no pueden actualizar priests de todos modos.
create or replace function public.priests_guard_status()
returns trigger language plpgsql as $$
begin
  if new.status <> old.status and auth.uid() is not null and not public.is_admin() then
    raise exception 'Solo un administrador puede cambiar el estado de verificación';
  end if;
  return new;
end $$;
