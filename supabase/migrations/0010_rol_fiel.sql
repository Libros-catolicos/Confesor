-- Rol de fiel (cuenta opcional). Valor de enum en migración propia.
alter type public.user_role add value if not exists 'fiel';
