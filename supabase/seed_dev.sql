-- =====================================================================
-- Datos de prueba para desarrollo. NO ejecutar en producción.
-- Todos los usuarios demo tienen email *@demo.confesor.local y contraseña "demo-confesor".
-- Para limpiar: delete from auth.users where email like '%@demo.confesor.local';
-- =====================================================================

-- ---------- Usuarios (el trigger crea profiles + priests) ----------
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change)
select
  ('00000000-0000-0000-0000-0000000001' || lpad(n::text, 2, '0'))::uuid,
  '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
  email, extensions.crypt('demo-confesor', extensions.gen_salt('bf')), now(),
  '{"provider":"email","providers":["email"]}', meta::jsonb, now(), now(), '', '', '', ''
from (values
  (1, 'sacerdote1@demo.confesor.local', '{"full_name":"P. Javier Martínez Ochoa","languages":["es","en"]}'),
  (2, 'sacerdote2@demo.confesor.local', '{"full_name":"P. Andrés Villalobos","languages":["es","it","la"]}'),
  (3, 'sacerdote3@demo.confesor.local', '{"full_name":"P. Tomasz Kowalski","languages":["pl","es","en"]}'),
  (4, 'sacerdote4@demo.confesor.local', '{"full_name":"P. Miguel Ángel Serrano","languages":["es"]}'),
  (5, 'sacerdote5@demo.confesor.local', '{"full_name":"P. Jean-Baptiste Morel","languages":["fr","es","en"]}'),
  (6, 'sacerdote6@demo.confesor.local', '{"full_name":"P. Luis Fernando Arriaga","languages":["es","pt"]}'),
  (7, 'sacerdote7@demo.confesor.local', '{"full_name":"Mn. Jordi Puigdevall","languages":["ca","es","en"]}'),
  (8, 'sacerdote8@demo.confesor.local', '{"full_name":"P. Vicente Ferrer Llopis","languages":["es","ca","de"]}'),
  (9, 'sacerdote9@demo.confesor.local', '{"full_name":"P. Pendiente de Verificar","languages":["es"]}')
) as t(n, email, meta);

-- ---------- Fichas: estado, slug legible, bio, diócesis ----------
update public.priests set status = 'verificado' where id::text like '00000000-0000-0000-0000-0000000001%' and id <> '00000000-0000-0000-0000-000000000109';

update public.priests set slug = 'javier-martinez', diocese = 'Madrid',
  bio = 'Párroco en el centro de Madrid desde 2015. Confieso a diario antes de la misa de la tarde y estoy disponible para hablar con quien lo necesite, sin prisa.'
  where id = '00000000-0000-0000-0000-000000000101';
update public.priests set slug = 'andres-villalobos', diocese = 'Madrid',
  bio = 'Sacerdote diocesano, capellán universitario. Atiendo confesiones en italiano y latín además de castellano.'
  where id = '00000000-0000-0000-0000-000000000102';
update public.priests set slug = 'tomasz-kowalski', diocese = 'Madrid',
  bio = 'Sacerdote polaco al servicio de la comunidad polaca e hispanohablante de Madrid. Confesiones en polaco, español e inglés.'
  where id = '00000000-0000-0000-0000-000000000103';
update public.priests set slug = 'miguel-angel-serrano', diocese = 'Madrid',
  bio = 'Confesor habitual en el barrio de Salamanca. Horario amplio de mañana y tarde.'
  where id = '00000000-0000-0000-0000-000000000104';
update public.priests set slug = 'jean-baptiste-morel', diocese = 'Madrid',
  bio = 'Prêtre français à Madrid. Confessions et accompagnement spirituel en français, espagnol et anglais.'
  where id = '00000000-0000-0000-0000-000000000105';
update public.priests set slug = 'luis-fernando-arriaga', diocese = 'Madrid',
  bio = 'Atiendo en dos parroquias de Chamberí. Disponible para confesión y para conversaciones de acompañamiento.'
  where id = '00000000-0000-0000-0000-000000000106';
update public.priests set slug = 'jordi-puigdevall', diocese = 'Barcelona',
  bio = 'Rector de parròquia al centre de Barcelona. Confessions en català, castellà i anglès.'
  where id = '00000000-0000-0000-0000-000000000107';
update public.priests set slug = 'vicente-ferrer', diocese = 'Valencia',
  bio = 'Párroco en el casco histórico de Valencia. Confieso también en alemán para los visitantes.'
  where id = '00000000-0000-0000-0000-000000000108';

-- ---------- Lugares ----------
insert into public.places (id, name, address, city, location, created_by) values
  ('00000000-0000-0000-0000-000000000201', 'Parroquia de San Ginés', 'Calle Arenal, 13', 'Madrid', 'SRID=4326;POINT(-3.7062 40.4170)', '00000000-0000-0000-0000-000000000101'),
  ('00000000-0000-0000-0000-000000000202', 'Basílica Pontificia de San Miguel', 'Calle de San Justo, 4', 'Madrid', 'SRID=4326;POINT(-3.7095 40.4139)', '00000000-0000-0000-0000-000000000102'),
  ('00000000-0000-0000-0000-000000000203', 'Parroquia de Santa Bárbara', 'Calle del General Castaños, 2', 'Madrid', 'SRID=4326;POINT(-3.6945 40.4250)', '00000000-0000-0000-0000-000000000103'),
  ('00000000-0000-0000-0000-000000000204', 'Parroquia de la Concepción de Nuestra Señora', 'Calle de Goya, 26', 'Madrid', 'SRID=4326;POINT(-3.6817 40.4247)', '00000000-0000-0000-0000-000000000104'),
  ('00000000-0000-0000-0000-000000000205', 'Parroquia de San Fermín de los Navarros', 'Paseo de Eduardo Dato, 10', 'Madrid', 'SRID=4326;POINT(-3.6930 40.4330)', '00000000-0000-0000-0000-000000000105'),
  ('00000000-0000-0000-0000-000000000206', 'Parroquia de Santa Teresa y San José', 'Plaza de España, 14', 'Madrid', 'SRID=4326;POINT(-3.7125 40.4240)', '00000000-0000-0000-0000-000000000106'),
  ('00000000-0000-0000-0000-000000000207', 'Parroquia de Nuestra Señora de los Ángeles', 'Calle de Bravo Murillo, 93', 'Madrid', 'SRID=4326;POINT(-3.7040 40.4460)', '00000000-0000-0000-0000-000000000106'),
  ('00000000-0000-0000-0000-000000000208', 'Parròquia de Santa Anna', 'Carrer de Santa Anna, 29', 'Barcelona', 'SRID=4326;POINT(2.1725 41.3852)', '00000000-0000-0000-0000-000000000107'),
  ('00000000-0000-0000-0000-000000000209', 'Parroquia de San Nicolás', 'Calle de los Caballeros, 35', 'Valencia', 'SRID=4326;POINT(-0.3790 39.4770)', '00000000-0000-0000-0000-000000000108');

insert into public.priest_places (priest_id, place_id) values
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000201'),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000202'),
  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000203'),
  ('00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000204'),
  ('00000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000000205'),
  ('00000000-0000-0000-0000-000000000106', '00000000-0000-0000-0000-000000000206'),
  ('00000000-0000-0000-0000-000000000106', '00000000-0000-0000-0000-000000000207'),
  ('00000000-0000-0000-0000-000000000107', '00000000-0000-0000-0000-000000000208'),
  ('00000000-0000-0000-0000-000000000108', '00000000-0000-0000-0000-000000000209');

-- ---------- Horarios semanales (weekday ISO: 1 lunes … 7 domingo) ----------
-- Javier Martínez: San Ginés, lunes a sábado 18:00-19:30 confesión (15 min); miércoles 11:00-12:00 conversación (30 min)
insert into public.availability_rules (priest_id, place_id, weekday, start_time, end_time, slot_minutes, type)
select '00000000-0000-0000-0000-000000000101'::uuid, '00000000-0000-0000-0000-000000000201'::uuid, d::smallint, '18:00'::time, '19:30'::time, 15::smallint, 'confesion'::public.slot_type from generate_series(1, 6) d
union all select '00000000-0000-0000-0000-000000000101'::uuid, '00000000-0000-0000-0000-000000000201'::uuid, 3::smallint, '11:00'::time, '12:00'::time, 30::smallint, 'conversacion'::public.slot_type;

-- Andrés Villalobos: San Miguel, martes y jueves 19:00-20:00 confesión; sábado 10:00-13:00 confesión
insert into public.availability_rules (priest_id, place_id, weekday, start_time, end_time, slot_minutes, type) values
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000202', 2, '19:00', '20:00', 20, 'confesion'),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000202', 4, '19:00', '20:00', 20, 'confesion'),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000202', 6, '10:00', '13:00', 20, 'confesion');

-- Tomasz Kowalski: Santa Bárbara, lunes a viernes 08:00-09:00 confesión; domingo 17:00-19:00 confesión
insert into public.availability_rules (priest_id, place_id, weekday, start_time, end_time, slot_minutes, type)
select '00000000-0000-0000-0000-000000000103'::uuid, '00000000-0000-0000-0000-000000000203'::uuid, d::smallint, '08:00'::time, '09:00'::time, 15::smallint, 'confesion'::public.slot_type from generate_series(1, 5) d
union all select '00000000-0000-0000-0000-000000000103'::uuid, '00000000-0000-0000-0000-000000000203'::uuid, 7::smallint, '17:00'::time, '19:00'::time, 15::smallint, 'confesion'::public.slot_type;

-- Miguel Ángel Serrano: Concepción, lunes a sábado 10:00-13:00 y 17:00-20:00 confesión (20 min)
insert into public.availability_rules (priest_id, place_id, weekday, start_time, end_time, slot_minutes, type)
select '00000000-0000-0000-0000-000000000104'::uuid, '00000000-0000-0000-0000-000000000204'::uuid, d::smallint, '10:00'::time, '13:00'::time, 20::smallint, 'confesion'::public.slot_type from generate_series(1, 6) d
union all
select '00000000-0000-0000-0000-000000000104'::uuid, '00000000-0000-0000-0000-000000000204'::uuid, d::smallint, '17:00'::time, '20:00'::time, 20::smallint, 'confesion'::public.slot_type from generate_series(1, 6) d;

-- Jean-Baptiste Morel: San Fermín, lunes/miércoles/viernes 19:30-20:30 confesión; jueves 17:00-19:00 conversación (30 min)
insert into public.availability_rules (priest_id, place_id, weekday, start_time, end_time, slot_minutes, type) values
  ('00000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000000205', 1, '19:30', '20:30', 20, 'confesion'),
  ('00000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000000205', 3, '19:30', '20:30', 20, 'confesion'),
  ('00000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000000205', 5, '19:30', '20:30', 20, 'confesion'),
  ('00000000-0000-0000-0000-000000000105', '00000000-0000-0000-0000-000000000205', 4, '17:00', '19:00', 30, 'conversacion');

-- Luis Fernando Arriaga: dos parroquias. Santa Teresa lunes-miércoles 18:00-19:00; Ntra. Sra. de los Ángeles jueves-sábado 18:00-19:00; conversación martes 11:00-12:30 en Santa Teresa
insert into public.availability_rules (priest_id, place_id, weekday, start_time, end_time, slot_minutes, type)
select '00000000-0000-0000-0000-000000000106'::uuid, '00000000-0000-0000-0000-000000000206'::uuid, d::smallint, '18:00'::time, '19:00'::time, 15::smallint, 'confesion'::public.slot_type from generate_series(1, 3) d
union all
select '00000000-0000-0000-0000-000000000106'::uuid, '00000000-0000-0000-0000-000000000207'::uuid, d::smallint, '18:00'::time, '19:00'::time, 15::smallint, 'confesion'::public.slot_type from generate_series(4, 6) d
union all select '00000000-0000-0000-0000-000000000106'::uuid, '00000000-0000-0000-0000-000000000206'::uuid, 2::smallint, '11:00'::time, '12:30'::time, 30::smallint, 'conversacion'::public.slot_type;

-- Jordi Puigdevall: Santa Anna (Barcelona), lunes a viernes 12:00-13:00 y 19:00-20:00
insert into public.availability_rules (priest_id, place_id, weekday, start_time, end_time, slot_minutes, type)
select '00000000-0000-0000-0000-000000000107'::uuid, '00000000-0000-0000-0000-000000000208'::uuid, d::smallint, '12:00'::time, '13:00'::time, 15::smallint, 'confesion'::public.slot_type from generate_series(1, 5) d
union all
select '00000000-0000-0000-0000-000000000107'::uuid, '00000000-0000-0000-0000-000000000208'::uuid, d::smallint, '19:00'::time, '20:00'::time, 15::smallint, 'confesion'::public.slot_type from generate_series(1, 5) d;

-- Vicente Ferrer: San Nicolás (Valencia), martes a sábado 10:30-12:00 confesión; viernes 17:00-18:00 conversación
insert into public.availability_rules (priest_id, place_id, weekday, start_time, end_time, slot_minutes, type)
select '00000000-0000-0000-0000-000000000108'::uuid, '00000000-0000-0000-0000-000000000209'::uuid, d::smallint, '10:30'::time, '12:00'::time, 15::smallint, 'confesion'::public.slot_type from generate_series(2, 6) d
union all select '00000000-0000-0000-0000-000000000108'::uuid, '00000000-0000-0000-0000-000000000209'::uuid, 5::smallint, '17:00'::time, '18:00'::time, 30::smallint, 'conversacion'::public.slot_type;

-- ---------- Ausencias: Javier Martínez no está pasado mañana; Miguel Ángel falta la tarde de mañana ----------
insert into public.absences (priest_id, date, start_time, end_time, note) values
  ('00000000-0000-0000-0000-000000000101', current_date + 2, null, null, 'Retiro diocesano'),
  ('00000000-0000-0000-0000-000000000104', current_date + 1, '17:00', '20:00', 'Funeral');

-- ---------- Un par de citas ya reservadas para que se vean huecos ocupados ----------
select public.book_appointment('00000000-0000-0000-0000-000000000104', '00000000-0000-0000-0000-000000000204',
  (select min(starts_at) from public.priest_free_slots('00000000-0000-0000-0000-000000000104', current_date, current_date + 7)),
  'confesion', 'es', 'María', 'maria@demo.confesor.local');
select public.book_appointment('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000201',
  (select min(starts_at) from public.priest_free_slots('00000000-0000-0000-0000-000000000101', current_date, current_date + 7) where type = 'confesion'),
  'confesion', 'en', 'John', 'john@demo.confesor.local');
