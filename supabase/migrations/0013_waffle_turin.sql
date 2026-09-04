-- El Waffle lleva el Turín y las mermeladas dentro de sus 2 toppings incluidos:
-- lista de insumos premium que en ese producto no cobran su precio.
alter table public.products add column if not exists free_premium jsonb;
