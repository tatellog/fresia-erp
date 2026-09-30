-- Sección "Otros": productos que no son de ninguna línea (como el pan de muerto)
-- y que en el punto de venta van en Extras. Amplía el check de línea.

alter table public.products drop constraint if exists products_line_check;
alter table public.products
  add constraint products_line_check
  check (line in ('clasica', 'chocolate', 'balance', 'brulee', 'uvas', 'nogada', 'mix', 'waffle', 'bebidas', 'despensa', 'granada', 'otros'));
