-- Foto por producto subida desde el formulario del menú (data URL JPEG cuadrado).
-- Si es null, la app usa la foto fija del menú según la línea.

alter table public.products add column if not exists photo text;
