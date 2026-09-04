-- Línea Granada: granada desgranada + crema, mismos precios que la Clásica.
-- Amplía el check de línea para aceptar 'granada'.

alter table public.products drop constraint if exists products_line_check;
alter table public.products
  add constraint products_line_check
  check (line in ('clasica', 'chocolate', 'balance', 'brulee', 'uvas', 'nogada', 'mix', 'waffle', 'bebidas', 'despensa', 'granada'));
