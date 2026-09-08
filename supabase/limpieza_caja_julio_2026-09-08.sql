-- Limpieza de la caja de prueba de julio (8 de septiembre de 2026).
-- En julio se abrió una caja de prueba en otro dispositivo y nunca se cerró.
-- Con la bajada desde la nube llegó a la tienda y la app la tomó como caja
-- vigente: la venta real de las 2:55 pm ($140) quedó colgada de ella.
--
-- 1) La venta real pasa a la caja de hoy.
-- 2) Se borran las tres ventas de prueba (julio y 5 de agosto) y esa caja.
-- Las bajas dejan lápida y llegan solas a todos los dispositivos.
--
-- Correr con:  supabase db query --linked -f supabase/limpieza_caja_julio_2026-09-08.sql

update public.sales
   set session_id = '920a413d-8e10-4168-8275-e2dff3577921'
 where id = '4c9628a1-b3c4-4850-a17a-cb08c7633917';

delete from public.sales where id in (
  '022a73b3-095e-410b-9d6b-e1cb58231774',
  '7fc3d967-8c51-4f58-859a-cc3e3222397c',
  '23c7ca1a-fe80-4f7d-91cf-89bc63b0c74f'
);

delete from public.cash_sessions where id = 'e96255f5-d180-48ef-afbe-9ddca34bc558';

select (select count(*) from public.cash_sessions where close_ts is null) as cajas_abiertas,
       (select count(*) from public.sales where session_id = '920a413d-8e10-4168-8275-e2dff3577921') as ventas_caja_hoy;
