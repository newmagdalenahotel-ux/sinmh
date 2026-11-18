# SINMH — Sistema Integral New Magdalena Hotel

Sistema para reemplazar el SIMP (reservas y check-in) y las planillas de Excel (caja y bar), con una sola fuente de verdad para la operación del hotel.

**Estado:** Fase actual de operación base. Ya funcionan alojamiento walk-in,
folios, cargos, check-out, caja, contabilidad, reportes, usuarios y bar recepción.
Faltan reservas, tablero de habitaciones, compras/inventario, cambio de turno y
traslados para cerrar las pruebas manuales.

## Documentos

- [SPEC.md](docs/SPEC.md) — alcance, módulos y reglas de negocio.
- [requirements.md](docs/requirements.md) — requisitos con criterios de aceptación.
- [design.md](docs/design.md) — arquitectura del frontend, pantallas y base de datos.
- [design-system.md](docs/design-system.md) — identidad visual.
- [tasks.md](docs/tasks.md) — plan por módulos y estado real.

## Datos

- `seeds/habitaciones.csv` — inventario de habitaciones.
- `seeds/tarifas.csv` — matriz de precios.

Los archivos con datos personales (`datos y procesos/`) no se versionan.

## Backend

```bash
cd backend
npm install
npm run migrate
npm run seed
npm run dev
```

- API: `http://localhost:3000`
- Health: `GET /health`
- Login: `POST /auth/login` con `admin` / `admin123`
- Catálogo: `GET /habitaciones` y `GET /tarifas` (requieren token)
- Disponibilidad: `GET /disponibilidad?desde=2026-11-20&hasta=2026-11-22&pax=2`
- Cotización: `GET /tarifas/cotizar?habitacion_id=1&pax=2&temporada=BAJA&escenario=NORMAL`
- Check-in: `POST /checkin` (cliente, reserva, huésped, folio, cargos y cobro)
- Caja: `GET /caja/sesion-actual`, `POST /caja/sesiones`, `POST /caja/sesiones/:id/cerrar`
- Caja avanzada: `POST /caja/movimientos` (gastos, retiros, aportes y ajustes)
- Folios: `GET /folios`, `GET /folios/:id`, `POST /folios/:id/checkout`
- Reportes: `GET /reportes/ingresos?fecha=...`, `GET /reportes/ocupacion`, `GET /reportes/libro?desde=...&hasta=...`, `GET /reportes/desayunos?fecha=...`
- Recibo PDF: `GET /cobros/:id/recibo`
- Administración: `GET /admin/usuarios`, `GET /admin/roles`, `POST /admin/usuarios`, `PUT /admin/usuarios/:id`
- Cargos manuales: `POST /folios/:id/cargos`, `GET /catalogos/centros`
- Bar recepción: `GET /productos`, `POST /productos`, `GET /bar/ventas`, `POST /bar/ventas`
- Semilla: 33 habitaciones, 31 rentables y 50 tarifas
- Base: PostgreSQL embebido (PGlite) en `backend/.data`; el mismo esquema corre en PostgreSQL real.
- Los datos de `datos y procesos/` no se versionan.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

- URL: `http://127.0.0.1:5173`
- Login: `admin` / `admin123`
- Consume la API en `http://localhost:3000`.

![Login](docs/capturas/franja-0-login.png)

![Check-in](docs/capturas/checkin-form.png)

![Caja](docs/capturas/caja-con-cobro.png)

![Caja avanzada](docs/capturas/caja-avanzada.png)

![Huéspedes en casa](docs/capturas/folios-detalle.png)

![Cargos al folio](docs/capturas/cargos-folio.png)

![Bar recepción](docs/capturas/bar-recepcion.png)

![Reportes](docs/capturas/reportes.png)

![Desayunos del día](docs/capturas/reportes-desayunos.png)

![Usuarios y roles](docs/capturas/configuracion.png)

## Todo desde la raíz

```bash
npm install
npm run dev
```

Levanta la API y la web al mismo tiempo con `concurrently`.

## Siguiente paso

Organizar el frontend por módulos y completar reservas y tablero de habitaciones.
Después: compras, inventario y traslados del bar; cambio de turno y traslados de
caja. El orden está en [tasks.md](docs/tasks.md).

## Repositorio remoto

`https://github.com/newmagdalenahotel-ux/sinmh` — rama `main`.
