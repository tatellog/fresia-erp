-- Caja v2: retiros de efectivo y justificación de diferencias en cortes.
-- Ejecutar después de 0004, en el SQL Editor de Supabase.

alter table public.expenses
  add column if not exists kind text not null default 'gasto' check (kind in ('gasto','retiro'));

alter table public.cash_sessions
  add column if not exists note text;
