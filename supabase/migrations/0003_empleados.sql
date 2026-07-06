-- Personal que atiende: firma de ventas y cortes.
-- El PIN es solo local en cada dispositivo; a la nube nunca se sube.
-- Ejecutar después de 0002, en el SQL Editor de Supabase.

create table if not exists public.employees (
  id uuid primary key,
  name text not null,
  active boolean not null default true,
  branch text not null default 'Principal',
  updated_at timestamptz not null default now()
);

alter table public.employees enable row level security;
drop policy if exists "authenticated all" on public.employees;
create policy "authenticated all" on public.employees for all to authenticated using (true) with check (true);

alter table public.sales add column if not exists employee text;
alter table public.cash_sessions add column if not exists employee text;
