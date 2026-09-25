-- Propina y comisión de tarjeta por venta, y forma de pago de gastos y compras.
-- Aplicar con: supabase db query --linked -f supabase/migrations/0019_propinas_comision_pago_gastos.sql

alter table public.sales
  add column if not exists tip numeric not null default 0,
  add column if not exists fee numeric not null default 0;

alter table public.expenses
  add column if not exists payment text not null default 'efectivo'
    check (payment in ('efectivo','tarjeta','transferencia'));
