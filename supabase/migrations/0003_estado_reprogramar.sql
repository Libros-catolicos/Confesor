-- Nuevo estado: el sacerdote ha cancelado proponiendo otra hora y espera respuesta del fiel.
-- (Va en su propia migración: un valor nuevo de enum no puede usarse en la misma transacción.)
alter type public.appointment_status add value if not exists 'reprogramar';
