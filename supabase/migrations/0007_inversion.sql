-- Registro de inversión de apertura (quién pagó qué y cuánto resta).
-- Ejecutar después de 0006, en el SQL Editor de Supabase.

create table if not exists public.investments (
  id uuid primary key,
  ts timestamptz not null,
  concept text not null,
  amount numeric not null default 0,
  paid_by text,
  pending numeric not null default 0,
  branch text not null default 'Principal',
  updated_at timestamptz not null default now()
);

alter table public.investments enable row level security;
drop policy if exists "authenticated all" on public.investments;
create policy "authenticated all" on public.investments for all to authenticated using (true) with check (true);
