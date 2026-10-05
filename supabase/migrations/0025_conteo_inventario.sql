-- Conteo rápido de inventario y tipo de control por insumo.
-- Aplicar con: supabase db query --linked -f supabase/migrations/0025_conteo_inventario.sql

-- crítico, empaque o consumible; null = se deduce del nombre en la app
alter table public.ingredients add column if not exists kind text
  check (kind is null or kind in ('critico','empaque','consumible'));

create table if not exists public.inventory_counts (
  id uuid primary key,
  ts timestamptz not null,
  ingredient_id uuid not null,
  ingredient_name text not null,
  expected numeric not null,
  counted numeric not null,
  diff numeric not null,
  diff_cost numeric not null default 0,
  reason text not null check (reason in ('ajuste','merma')),
  employee text,
  branch text not null default 'Principal',
  updated_at timestamptz not null default now()
);
create index if not exists inventory_counts_updated_idx on public.inventory_counts (branch, updated_at);

alter table public.inventory_counts enable row level security;
drop policy if exists "authenticated all" on public.inventory_counts;
create policy "authenticated all" on public.inventory_counts for all to authenticated using (true) with check (true);

drop trigger if exists touch_updated_at on public.inventory_counts;
create trigger touch_updated_at before insert or update on public.inventory_counts
  for each row execute function public.touch_updated_at();
drop trigger if exists log_deleted_row on public.inventory_counts;
create trigger log_deleted_row after delete on public.inventory_counts
  for each row execute function public.log_deleted_row();
