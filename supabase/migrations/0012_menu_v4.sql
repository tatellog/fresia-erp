-- Menú v4 (septiembre 2026): Frésia del mes (Nogada), Mix Frésia, Waffle,
-- bebidas (tés y agua) y despensa (miel y pepitas). Amplía el check de línea.

alter table public.products drop constraint if exists products_line_check;
alter table public.products
  add constraint products_line_check
  check (line in ('clasica', 'chocolate', 'balance', 'brulee', 'uvas', 'nogada', 'mix', 'waffle', 'bebidas', 'despensa'));

-- toppings incluidos por producto (ausente = 2); la Nogada incluye 1 porque la nuez ocupa el otro
alter table public.products add column if not exists included_toppings integer;
