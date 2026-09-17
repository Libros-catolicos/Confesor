-- =====================================================================
-- Contenido editorial gestionado desde /admin: artículos de Recursos y
-- libros de lectura espiritual. Lectura pública; escritura solo admin.
-- =====================================================================

create table public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title text not null,
  summary text,
  section text not null default 'confesion' check (section in ('confesion', 'preparacion', 'dudas')),
  body_md text not null default '',
  order_index int not null default 99,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger articles_updated_at before update on public.articles
  for each row execute function public.set_updated_at();

create table public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text,
  description text,
  url text,
  cover_url text,
  featured boolean not null default false,
  order_index int not null default 99,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger books_updated_at before update on public.books
  for each row execute function public.set_updated_at();

alter table public.articles enable row level security;
alter table public.books enable row level security;

create policy articles_select on public.articles for select to anon, authenticated
  using (published or public.is_admin());
create policy articles_admin on public.articles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy books_select on public.books for select to anon, authenticated
  using (published or public.is_admin());
create policy books_admin on public.books for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

grant select on public.articles, public.books to anon;
grant select, insert, update, delete on public.articles, public.books to authenticated;

-- El admin también necesita ver perfiles y notas de verificación (ya cubierto por is_admin()
-- en profiles/priest_private) y cambiar el estado del sacerdote (trigger priests_guard_status).

-- ---------- Portadas de libros: bucket público, escribe solo admin ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('portadas', 'portadas', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy portadas_public_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'portadas');
create policy portadas_admin_write on storage.objects for insert to authenticated
  with check (bucket_id = 'portadas' and public.is_admin());
create policy portadas_admin_update on storage.objects for update to authenticated
  using (bucket_id = 'portadas' and public.is_admin());
create policy portadas_admin_delete on storage.objects for delete to authenticated
  using (bucket_id = 'portadas' and public.is_admin());
