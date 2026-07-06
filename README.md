# Frésia OS

Sistema operativo de **Frésia** (fresas con crema): punto de venta, caja, menú con recetas y toppings, inventario, compras, mermas, personal, dashboard y sincronización multi-sucursal. **PWA offline-first**: los datos viven en el dispositivo (IndexedDB) y la app funciona igual con o sin internet; cuando hay red, todo se respalda en Supabase.

Pensada para **iPad en mostrador** (POS con carrito fijo) y **computadora** (panel administrativo); en teléfono usa navegación inferior.

## Módulos

| Sección | Qué hace |
|---|---|
| **Vender** | POS: líneas Clásica y Balance por tamaño, selector de toppings (2 incluidos, adicionales $15), combos, extras y bebidas. Cada venta descuenta insumos por receta y porción de topping, y queda firmada por quien atiende (PIN). |
| **Insumos** | Inventario: compras con costo promedio ponderado, mermas, alertas de stock mínimo. |
| **Menú** | Productos con receta, costo real, ganancia y margen; toppings elegibles por línea. |
| **Caja** | Apertura con fondo, gastos del turno, corte esperado vs. contado, historial. |
| **Dashboard** | KPIs de hoy vs. ayer, gráfica de 14 días, ventas por línea, top productos, métodos de pago, stock bajo, últimas ventas. |
| **Ajustes** | Personal (PIN), nube y sucursales, modo demostración, respaldo JSON, borrado. |

## Estructura de carpetas

```
src/
├─ data/        capa de datos: types.ts (modelo), db.ts (Dexie), init.ts, migrate.ts, seed.ts, ids.ts
├─ services/    lógica de negocio, un dominio por archivo:
│  │            sales, inventory, catalog, cash, staff, costing, backup, outbox, demo
│  └─ sync/     client (Supabase), mapping (filas → Postgres), settings (sucursal), engine (outbox flush)
├─ components/
│  ├─ ui/       un componente por archivo: Button, Card, Sheet, Input, Field, Empty, Stepper, icons
│  └─ layout/   SidebarNav, TabBar, MobileHeader, Wordmark, OfflineChip, tabs
├─ features/    sub-componentes por módulo: vender/, inventario/, productos/, caja/, dashboard/, ajustes/
├─ hooks/       useOnline
└─ pages/       orquestadores delgados: Vender, Inventario, Productos, Caja, Dashboard, Ajustes
supabase/migrations/   esquema Postgres (0001 base · 0002 toppings · 0003 empleados)
```

Dependencias en una sola dirección: `pages → features → services → data`.

## Modelo de datos

| Tabla | Campos clave |
|---|---|
| `ingredients` | unidad (g/ml/pza), stock, costo promedio, mínimo, grupos de topping y porción |
| `products` | precio, receta (insumos por unidad), línea de toppings, activo, orden |
| `sales` | ts, renglones (producto, qty, precio cobrado, costo, toppings), pago, sesión, firma |
| `purchases` / `wastes` | movimientos de inventario con costo/motivo |
| `expenses` | gastos ligados al turno |
| `cash_sessions` | apertura, esperado, contado, firma |
| `employees` | nombre, PIN (solo local, nunca sube a la nube), activo |
| `outbox` / `meta` | cola de sincronización e índices del dispositivo |

Todos los IDs son UUID generados en el dispositivo (seguro entre sucursales); cada fila en la nube lleva `branch`.

## Correr, probar y desplegar

```bash
npm install
npm run dev        # desarrollo
npm run build      # produce dist/ con service worker (PWA)
```

Para explorar con datos vivos: **Ajustes → Modo demostración** carga 14 días simulados (ventas, costos, cortes, personal con PIN 1111/2222) sin tocar la nube. Para operar en serio: Ajustes → Zona de peligro → borrar todo y arrancar con el catálogo real en ceros.

**Nube**: Ajustes → Nube y sucursales → iniciar sesión (usuario de Supabase Auth). Cada cambio se encola localmente y se sube por lotes idempotentes al volver la red. Migraciones en `supabase/migrations/`.

**Instalar en iPad/iPhone**: Safari → Compartir → «Agregar a inicio». En Android: «Instalar app».
