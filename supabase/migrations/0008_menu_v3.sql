-- Menú v3 (agosto 2026): tamaños en onzas, línea Frèsia Brûlée y toppings
-- premium (Pistache, Lotus). Ejecutar después de 0007, en el SQL Editor.

alter table public.products drop constraint if exists products_line_check;
alter table public.products
  add constraint products_line_check check (line in ('clasica', 'chocolate', 'balance', 'brulee'));

alter table public.ingredients
  add column if not exists premium_price numeric;
