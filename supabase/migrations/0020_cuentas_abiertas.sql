-- Cuentas abiertas: pedidos servidos que el cliente paga al final.
-- Aplicar con: supabase db query --linked -f supabase/migrations/0020_cuentas_abiertas.sql

create table if not exists public.open_tabs (
  id uuid primary key,
  name text not null,
  open_ts timestamptz not null,
  lines jsonb not null,
  total numeric not null default 0,
  used jsonb not null default '{}'::jsonb,
  employee text,
  branch text not null default 'Principal',
  updated_at timestamptz not null default now()
);
create index if not exists open_tabs_updated_idx on public.open_tabs (branch, updated_at);

alter table public.open_tabs enable row level security;
drop policy if exists "authenticated all" on public.open_tabs;
create policy "authenticated all" on public.open_tabs for all to authenticated using (true) with check (true);

-- mismo trato que las demás tablas: updated_at del servidor y lápida al borrar,
-- para que una cuenta cobrada en un dispositivo desaparezca de los demás
drop trigger if exists touch_updated_at on public.open_tabs;
create trigger touch_updated_at before insert or update on public.open_tabs
  for each row execute function public.touch_updated_at();
drop trigger if exists log_deleted_row on public.open_tabs;
create trigger log_deleted_row after delete on public.open_tabs
  for each row execute function public.log_deleted_row();
