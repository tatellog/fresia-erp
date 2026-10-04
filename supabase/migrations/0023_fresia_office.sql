-- Uber Eats se reemplaza por Frésia Office como canal de cobro.
-- Las 2 ventas marcadas como Uber Eats en realidad fueron por transferencia.
-- 'uber' se sigue aceptando por si un equipo sube ventas viejas antes de actualizarse.

alter table public.sales drop constraint if exists sales_payment_check;
update public.sales set payment = 'transferencia' where payment = 'uber';
alter table public.sales
  add constraint sales_payment_check
  check (payment in ('efectivo','tarjeta','transferencia','rappi','didi','office','uber'));
