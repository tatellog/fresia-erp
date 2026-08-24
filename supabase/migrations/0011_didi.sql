-- DiDi Food como canal de cobro de delivery.

alter table public.sales drop constraint if exists sales_payment_check;
alter table public.sales
  add constraint sales_payment_check
  check (payment in ('efectivo','tarjeta','transferencia','rappi','uber','didi'));
