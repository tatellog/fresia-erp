-- Línea Uvas con Crema: uva verde + crema, mismos precios que la Clásica.
-- Amplía el check de línea para aceptar 'uvas'.

alter table public.products drop constraint if exists products_line_check;
alter table public.products
  add constraint products_line_check check (line in ('clasica', 'chocolate', 'balance', 'brulee', 'uvas'));
