-- priests es de lectura pública (fichas verificadas). Los datos privados del
-- sacerdote (token del calendario, notas de verificación) van a una tabla aparte
-- con RLS solo para el dueño y el admin.

create table public.priest_private (
  priest_id uuid primary key references public.priests(id) on delete cascade,
  calendar_token uuid not null default gen_random_uuid() unique,
  verification_notes text,
  updated_at timestamptz not null default now()
);
create trigger priest_private_updated_at before update on public.priest_private
  for each row execute function public.set_updated_at();

insert into public.priest_private (priest_id, calendar_token, verification_notes)
select id, calendar_token, verification_notes from public.priests;

alter table public.priests drop column calendar_token, drop column verification_notes;

alter table public.priest_private enable row level security;
create policy priest_private_select on public.priest_private for select to authenticated
  using (priest_id = auth.uid() or public.is_admin());
create policy priest_private_update on public.priest_private for update to authenticated
  using (priest_id = auth.uid()) with check (priest_id = auth.uid());
grant select, update on public.priest_private to authenticated;

-- El alta crea también la fila privada
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare
  v_name text := coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1));
  v_slug text;
begin
  insert into public.profiles (id, full_name, email)
  values (new.id, v_name, new.email);

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

-- El feed lee el token de la tabla privada
create or replace function public.calendar_feed(p_token uuid)
returns table (
  id uuid, starts_at timestamptz, ends_at timestamptz, type public.slot_type, status public.appointment_status,
  guest_name text, guest_email text, guest_phone text, language text, updated_at timestamptz,
  place_name text, address text, city text
)
language sql stable security definer set search_path = public as $$
  select a.id, a.starts_at, a.ends_at, a.type, a.status, a.guest_name, a.guest_email, a.guest_phone,
         a.language, a.updated_at, pl.name, pl.address, pl.city
  from public.priest_private pp
  join public.appointments a on a.priest_id = pp.priest_id
  join public.places pl on pl.id = a.place_id
  where pp.calendar_token = p_token
    and a.status in ('pendiente', 'confirmada', 'completada')
    and a.starts_at > now() - interval '30 days'
  order by a.starts_at;
$$;
