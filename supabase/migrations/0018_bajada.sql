-- Sincronización de bajada: cada dispositivo trae de la nube lo que cambió
-- desde su última consulta. Para eso el servidor marca en updated_at el
-- momento de cada alta o cambio (con su propio reloj, no el del dispositivo)
-- y deja una lápida por cada fila borrada, para que los demás la quiten.

alter table public.sales         add column if not exists updated_at timestamptz not null default now();
alter table public.purchases     add column if not exists updated_at timestamptz not null default now();
alter table public.wastes        add column if not exists updated_at timestamptz not null default now();
alter table public.expenses      add column if not exists updated_at timestamptz not null default now();
alter table public.cash_sessions add column if not exists updated_at timestamptz not null default now();

create table if not exists public.deleted_rows (
  table_name text not null,
  id text not null,
  branch text not null default 'Principal',
  deleted_at timestamptz not null default now(),
  primary key (table_name, id)
);
create index if not exists deleted_rows_branch_idx on public.deleted_rows (branch, deleted_at);

alter table public.deleted_rows enable row level security;
drop policy if exists "authenticated all" on public.deleted_rows;
create policy "authenticated all" on public.deleted_rows for all to authenticated using (true) with check (true);

-- updated_at siempre lo pone el servidor; al reinsertar una fila borrada se retira su lápida
create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  if tg_op = 'INSERT' then
    delete from public.deleted_rows where table_name = tg_table_name and id = new.id::text;
  end if;
  return new;
end $$;

create or replace function public.log_deleted_row() returns trigger language plpgsql as $$
begin
  insert into public.deleted_rows (table_name, id, branch, deleted_at)
  values (tg_table_name, old.id::text, old.branch, now())
  on conflict (table_name, id) do update set deleted_at = now(), branch = excluded.branch;
  return old;
end $$;

do $$
declare t text;
begin
  foreach t in array array['ingredients','products','sales','purchases','wastes','expenses','cash_sessions','employees','investments','topping_lists'] loop
    execute format('drop trigger if exists touch_updated_at on public.%I', t);
    execute format('create trigger touch_updated_at before insert or update on public.%I for each row execute function public.touch_updated_at()', t);
    execute format('drop trigger if exists log_deleted_row on public.%I', t);
    execute format('create trigger log_deleted_row after delete on public.%I for each row execute function public.log_deleted_row()', t);
    execute format('create index if not exists %I on public.%I (branch, updated_at)', t || '_updated_idx', t);
  end loop;
end $$;
