-- Menú v2: tres líneas (clásica, chocolate, balance) y extras con reglas
-- por línea. Ejecutar después de 0003, en el SQL Editor de Supabase.

alter table public.products
  add column if not exists line text check (line in ('clasica','chocolate','balance')),
  add column if not exists extra_scope jsonb;
