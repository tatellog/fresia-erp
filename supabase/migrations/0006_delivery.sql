-- Canales de delivery: Rappi y Uber Eats como métodos de cobro.
-- Ejecutar después de 0005, en el SQL Editor de Supabase.

alter table public.sales drop constraint if exists sales_payment_check;
alter table public.sales
  add constraint sales_payment_check
  check (payment in ('efectivo','tarjeta','transferencia','rappi','uber'));
