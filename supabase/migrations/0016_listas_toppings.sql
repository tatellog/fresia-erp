-- Listas de toppings editables desde el menú. Antes eran dos fijas
-- ('clasica' y 'balance'); ahora se pueden crear más y el producto
-- apunta a la lista de la que escoge el cliente.

create table if not exists public.topping_lists (
  id text primary key,
  name text not null,
  sort integer not null default 0,
  branch text not null default 'Principal',
  updated_at timestamptz not null default now()
);

alter table public.topping_lists enable row level security;
drop policy if exists "authenticated all" on public.topping_lists;
create policy "authenticated all" on public.topping_lists for all to authenticated using (true) with check (true);

insert into public.topping_lists (id, name, sort) values
  ('clasica', 'Clásica', 1),
  ('balance', 'Balance', 2)
on conflict (id) do nothing;

-- el producto ya puede apuntar a cualquier lista, no solo a las dos originales
alter table public.products drop constraint if exists products_topping_group_check;
