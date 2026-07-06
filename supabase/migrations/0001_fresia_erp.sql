-- Fresia ERP — esquema inicial (multi-sucursal, sync desde PWA offline-first)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query → pegar → Run.
--
-- Diseño: las filas llegan por upsert idempotente desde los dispositivos
-- (patrón outbox). No hay FKs entre tablas de eventos a propósito: los
-- lotes pueden llegar en cualquier orden y nunca deben rechazarse.

create table if not exists public.ingredients (
  id uuid primary key,
  name text not null,
  unit text not null check (unit in ('g','ml','pza')),
  stock numeric not null default 0,
  cost numeric not null default 0,
  min_stock numeric not null default 0,
  branch text not null default 'Principal',
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key,
  name text not null,
  emoji text not null default '🍓',
  price numeric not null,
  recipe jsonb not null default '[]',
  active boolean not null default true,
  sort integer not null default 0,
  branch text not null default 'Principal',
  updated_at timestamptz not null default now()
);

create table if not exists public.sales (
  id uuid primary key,
  ts timestamptz not null,
  items jsonb not null,
  total numeric not null,
  cost numeric not null default 0,
  payment text not null check (payment in ('efectivo','tarjeta','transferencia')),
  session_id uuid,
  branch text not null default 'Principal'
);

create table if not exists public.purchases (
  id uuid primary key,
  ts timestamptz not null,
  ingredient_id uuid,
  ingredient_name text not null,
  qty numeric not null,
  total_cost numeric not null,
  note text,
  branch text not null default 'Principal'
);

create table if not exists public.wastes (
  id uuid primary key,
  ts timestamptz not null,
  ingredient_id uuid,
  ingredient_name text not null,
  qty numeric not null,
  reason text not null default '',
  branch text not null default 'Principal'
);

create table if not exists public.expenses (
  id uuid primary key,
  ts timestamptz not null,
  concept text not null,
  amount numeric not null,
  session_id uuid,
  branch text not null default 'Principal'
);

create table if not exists public.cash_sessions (
  id uuid primary key,
  open_ts timestamptz not null,
  close_ts timestamptz,
  open_amount numeric not null default 0,
  close_amount numeric,
  expected numeric,
  branch text not null default 'Principal'
);

-- Índices para reportes consolidados
create index if not exists sales_ts_idx on public.sales (ts);
create index if not exists sales_branch_idx on public.sales (branch);
create index if not exists purchases_ts_idx on public.purchases (ts);
create index if not exists expenses_ts_idx on public.expenses (ts);
create index if not exists cash_sessions_open_idx on public.cash_sessions (open_ts);

-- Seguridad: solo usuarios autenticados pueden leer/escribir.
-- (La llave publishable sola no da acceso a nada.)
do $$
declare t text;
begin
  foreach t in array array['ingredients','products','sales','purchases','wastes','expenses','cash_sessions'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "authenticated all" on public.%I', t);
    execute format('create policy "authenticated all" on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;
