-- =====================================================================
-- Enlaces sencillos: la ficha cuelga de la raíz (confesor.es/juan-perez).
-- El slug se genera limpio, sin sufijo aleatorio, y solo se numera si ya
-- está ocupado. La lista de rutas reservadas vive también en src/lib/slug.ts;
-- aquí solo se comprueban las que podrían chocar al darse de alta.
-- =====================================================================

create or replace function public.slug_disponible(p_slug text)
returns boolean
language sql stable security definer set search_path = public as $$
  select p_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
     and length(p_slug) between 3 and 40
     and p_slug not in (
       'admin', 'api', 'auth', 'aviso-legal', 'baja', 'buscar', 'cita', 'condiciones', 'contacto',
       'cuenta', 'login', 'mi-cuenta', 'panel', 'para-sacerdotes', 'privacidad', 'recuperar',
       'recursos', 'registro', 's', 'sin-conexion', 'app', 'ayuda', 'blog', 'confesor', 'donar',
       'iglesia', 'index', 'noticias', 'parroquia', 'prensa', 'sacerdote', 'sacerdotes', 'www'
     )
     and not exists (select 1 from public.priests where slug = p_slug);
$$;
grant execute on function public.slug_disponible to authenticated;

-- Slug legible a partir del nombre; si está ocupado o reservado, añade -2, -3…
create or replace function public.slug_para_nombre(p_nombre text)
returns text
language plpgsql stable security definer set search_path = public, extensions as $$
declare
  v_base text;
  v_slug text;
  i int := 1;
begin
  v_base := regexp_replace(lower(unaccent(coalesce(p_nombre, ''))), '[^a-z0-9]+', '-', 'g');
  v_base := trim(both '-' from v_base);
  v_base := left(v_base, 40);
  v_base := trim(both '-' from v_base);
  if length(v_base) < 3 then v_base := 'sacerdote'; end if;

  v_slug := v_base;
  while not public.slug_disponible(v_slug) loop
    i := i + 1;
    v_slug := left(v_base, 36) || '-' || i::text;
    exit when i > 500;
  end loop;
  return v_slug;
end $$;

-- El alta usa ya el slug limpio
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
declare
  v_name text := coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1));
  v_role text := coalesce(new.raw_user_meta_data ->> 'role', 'sacerdote');
begin
  if v_role = 'fiel' then
    insert into public.profiles (id, role, full_name, email) values (new.id, 'fiel', v_name, new.email);
    return new;
  end if;

  insert into public.profiles (id, full_name, email) values (new.id, v_name, new.email);
  insert into public.priests (id, slug, display_name, languages)
  values (
    new.id, public.slug_para_nombre(v_name), v_name,
    coalesce((select array_agg(x) from jsonb_array_elements_text(new.raw_user_meta_data -> 'languages') x), '{es}')
  );
  insert into public.priest_private (priest_id) values (new.id);
  return new;
end $$;
