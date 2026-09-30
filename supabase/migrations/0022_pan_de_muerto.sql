-- Sección Pan de muerto (temporada): tradicional y relleno Frésia.
-- Amplía el check de línea para aceptar 'pan'.

alter table public.products drop constraint if exists products_line_check;
alter table public.products
  add constraint products_line_check
  check (line in ('clasica', 'chocolate', 'balance', 'brulee', 'uvas', 'nogada', 'mix', 'waffle', 'bebidas', 'despensa', 'granada', 'otros', 'pan'));
