-- Compra con varios insumos: cada renglón guarda el proveedor y el id de la
-- compra a la que pertenece, para agruparlos y repetir la compra después.

alter table public.purchases add column if not exists supplier text;
alter table public.purchases add column if not exists batch_id text;
