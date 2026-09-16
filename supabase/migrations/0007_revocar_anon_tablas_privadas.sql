-- Supabase concede por defecto privilegios a anon en cada tabla nueva; RLS ya
-- filtra todo, pero revocamos explícitamente en las tablas con datos privados
-- (defensa en profundidad). Recordar esto al crear tablas nuevas.
revoke all on public.appointments, public.absences, public.profiles, public.priest_private from anon;
revoke insert, update, delete on public.priests, public.places, public.priest_places, public.availability_rules from anon;
