-- Insumos que se preparan en la tienda (la crema): receta para un rendimiento
-- y el lote que se suele hacer. {"yield": 3000, "batch": 5000, "items": [{"ingredientId": "…", "qty": 190}]}
-- Aplicar con: supabase db query --linked -f supabase/migrations/0026_preparaciones.sql

alter table public.ingredients add column if not exists prep jsonb;

-- insumo sin costo propio porque viene incluido con otro (las tapas con los vasos):
-- su costo en cero no cuenta como «falta precio de compra»
alter table public.ingredients add column if not exists included boolean;
