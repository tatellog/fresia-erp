-- Toppings elegibles (2 incluidos por vaso, adicionales con cargo).
-- Ejecutar después de 0001, en el SQL Editor de Supabase.

alter table public.ingredients
  add column if not exists topping_groups jsonb,
  add column if not exists portion numeric;

alter table public.products
  add column if not exists topping_group text check (topping_group in ('clasica','balance'));
