# Fresia ERP 🍓

ERP ligero para **Fresia** (fresas con crema): punto de venta, inventario de insumos, recetas y costos, caja y reportes. Es una **PWA offline-first**: todos los datos viven en el dispositivo (IndexedDB), así que **funciona igual con o sin internet**.

## Módulos

| Pestaña | Qué hace |
|---|---|
| **Vender** | Punto de venta: toca productos, cobra en efectivo/tarjeta/transferencia. Cada venta descuenta insumos según la receta. |
| **Insumos** | Inventario de materia prima (fresa, crema, vasos…), compras con costo promedio ponderado, mermas y alertas de stock mínimo. |
| **Menú** | Productos con receta, costo real por unidad, ganancia y margen. |
| **Caja** | Apertura con fondo, gastos del turno, corte con efectivo esperado vs. contado. |
| **Reportes** | Ventas, utilidad estimada, tickets, top de productos y desglose por método de pago (hoy / 7 / 30 días). |
| **Ajustes** ⚙️ | Respaldo y restauración en JSON, borrado de datos. |

## Correr en desarrollo

```bash
npm install
npm run dev
```

## Compilar y desplegar

```bash
npm run build      # genera dist/ con service worker (PWA)
npx vercel deploy  # o cualquier hosting estático
```

Una vez abierta en el teléfono: **Safari → Compartir → Agregar a inicio** (iPhone) o **Chrome → Instalar app** (Android). Después de la primera carga, la app abre y opera 100 % sin conexión.

## Datos, nube y respaldos

- Los datos se guardan primero en IndexedDB del dispositivo (`Dexie`): la app opera 100 % sin internet.
- **Sincronización con Supabase (multi-sucursal)**: cada cambio (venta, compra, merma, gasto, corte, catálogo) se encola en un *outbox* local y se sube por lotes idempotentes cuando hay red (al volver la señal, al abrir la app y cada 30 s). Se activa iniciando sesión en Ajustes → Nube; cada dispositivo declara su sucursal.
- Configuración: el esquema está en `supabase/migrations/0001_fresia_erp.sql` (pegar en el SQL Editor de Supabase). La app se compila con la llave publishable: `VITE_SUPABASE_KEY=sb_publishable_… npm run build`. Los usuarios se crean en Supabase → Authentication.
- El respaldo manual en JSON (Ajustes) sigue disponible como segunda red de seguridad.

## Arquitectura

- Vite + React 19 + TypeScript, Tailwind CSS 4
- Dexie (IndexedDB) con `useLiveQuery` — la UI reacciona sola a cambios en la base
- `vite-plugin-pwa` (Workbox) — precache de la app completa, actualización automática
- Ventas e inventario se escriben en **transacciones**: una venta registra el ticket y descuenta insumos de forma atómica (`src/lib/logic.ts`)
- Íconos de la PWA se generan desde `brand/fresia-2.png` con `npm run icons`

### Camino de crecimiento (v2)

La estructura ya deja listo el salto a multi-dispositivo: agregar una cola de sincronización (outbox) sobre las mismas tablas y un backend (p. ej. Supabase) que reciba los eventos cuando haya conexión. También: múltiples sucursales, usuarios/turnos con PIN e impresión de tickets.
