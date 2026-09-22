-- =====================================================================
-- Documento de verificación del sacerdote (celebret o equivalente), opcional.
-- Bucket PRIVADO: nunca hay URL pública; el sacerdote sube/ve/borra el suyo
-- (carpeta = su uuid) y el admin lo ve con un enlace firmado de corta duración.
-- Se conserva mientras exista la cuenta y se borra con ella.
-- =====================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('verificacion', 'verificacion', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

-- Carpeta propia: verificacion/<priest_id>/<fichero>
create policy verificacion_own_select on storage.objects for select to authenticated
  using (bucket_id = 'verificacion' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));
create policy verificacion_own_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'verificacion' and (storage.foldername(name))[1] = auth.uid()::text);
create policy verificacion_own_update on storage.objects for update to authenticated
  using (bucket_id = 'verificacion' and (storage.foldername(name))[1] = auth.uid()::text);
create policy verificacion_own_delete on storage.objects for delete to authenticated
  using (bucket_id = 'verificacion' and (storage.foldername(name))[1] = auth.uid()::text);

alter table public.priest_private
  add column if not exists verification_doc_path text,
  add column if not exists verification_doc_uploaded_at timestamptz;

-- Al borrar la cuenta (cascade sobre priests) desaparece también el documento
create or replace function public.priests_delete_storage()
returns trigger language plpgsql security definer set search_path = public, storage as $$
begin
  -- Supabase bloquea los delete directos sobre storage.objects salvo con este ajuste
  -- de sesión (véase storage.protect_delete). Solo dura esta transacción.
  perform set_config('storage.allow_delete_query', 'true', true);
  delete from storage.objects where bucket_id = 'verificacion' and name like old.id::text || '/%';
  return old;
end $$;
drop trigger if exists priests_delete_storage on public.priests;
create trigger priests_delete_storage before delete on public.priests
  for each row execute function public.priests_delete_storage();
