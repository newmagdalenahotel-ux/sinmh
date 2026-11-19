# SINMH — Sistema Integral New Magdalena Hotel

Sistema para reemplazar el SIMP (reservas y check-in) y las planillas de Excel (caja y bar), con una sola fuente de verdad para la operación del hotel.

**Estado:** 1A operativa y financiera implementadas. Funcionan reservas con
anticipo, edición y contrato, check-in, folios, cargos, check-out, caja con
traslados y cambio de turno, contabilidad, reportes, usuarios, bar recepción,
clientes con crédito, cuentas por cobrar, abonos, cuenta socio, tablero de
habitaciones, dashboard, menú desplegable y móvil, formularios en panel lateral, montos
con separador de miles, notificaciones auto-descartables, tarifas negociadas para
empresas/empleados, reserva grupal con pagador y rooming list, formulario de reserva
en 3 pasos con tarjetas de habitaciones, buscador de clientes y pagos divididos, y cuadre de caja en PDF.
Falta la validación manual, el anticipo consolidado del grupo y compras/inventario del bar.

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
- Tablero: `GET /habitaciones/tablero`, `PUT /habitaciones/:id/estado`
- Disponibilidad: `GET /disponibilidad?desde=2026-11-20&hasta=2026-11-22&pax=2`
- Cotización: `GET /tarifas/cotizar?habitacion_id=1&pax=2&temporada=BAJA&escenario=NORMAL`
- Check-in: `POST /checkin` (cliente, reserva, huésped, folio, cargos y cobro)
- Reservas: `GET/POST /reservas`, `GET /reservas/:id/detalle`, `POST /reservas/maestra`, `GET /reservas/maestra/:id`, `POST /reservas/maestra/:id/cancelar`, `PUT /reservas/:id`, `POST /reservas/:id/cancelar`, `POST /reservas/:id/checkin`, `GET /reservas/:id/contrato`, anticipo opcional
- Clientes: `GET/POST /clientes`, `PUT /clientes/:id` (dirección, ciudad, tarifa y vigencia)
- Cartera: `GET /cuentas-cobrar`, `GET /cuentas-cobrar/:id`, `POST /cuentas-cobrar/:id/abonos`
- Cuenta socio: `GET /caja/cuenta-socio`
- Caja: `GET /caja/sesion-actual`, `GET /caja/puntos-venta`, `GET /caja/sesiones-abiertas`, `POST /caja/sesiones`, `POST /caja/sesiones/:id/cerrar`
- Caja avanzada: `POST /caja/movimientos`, `POST /caja/traslados`, `POST /caja/sesiones/:id/cambio-turno`, `GET /caja/sesiones/:id/cuadre.pdf`
- Folios: `GET /folios`, `GET /folios/:id`, `POST /folios/:id/checkout`
- Reportes: `GET /reportes/ingresos?fecha=...`, `GET /reportes/ocupacion`, `GET /reportes/libro?desde=...&hasta=...`, `GET /reportes/desayunos?fecha=...`, `GET /reportes/resultado-centros?mes=...`
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

![Dashboard](docs/capturas/dashboard.png)

![Menú y encabezado](docs/capturas/menu-desktop.png)

![Menú móvil](docs/capturas/menu-mobile.png)

![Tablero de habitaciones](docs/capturas/habitaciones.png)

![Reservas](docs/capturas/reservas.png)

![Detalle de reserva](docs/capturas/reserva-detalle.png)

![Detalle de grupo](docs/capturas/grupo-detalle.png)

![Formulario en panel ancho](docs/capturas/reserva-panel.png)

![Reserva grupal con pagador](docs/capturas/reserva-grupal.png)

![Tarifa negociada de cliente](docs/capturas/cliente-tarifa.png)

![Edición de reserva](docs/capturas/reserva-edicion.png)

![Caja](docs/capturas/caja-con-cobro.png)

![Caja avanzada](docs/capturas/caja-avanzada.png)

![Cambio de turno y traslados](docs/capturas/caja-cambio-turno.png)

![Huéspedes en casa](docs/capturas/folios-detalle.png)

![Cargos al folio](docs/capturas/cargos-folio.png)

![Bar recepción](docs/capturas/bar-recepcion.png)

![Clientes](docs/capturas/clientes.png)

![Detalle de cliente](docs/capturas/cliente-detalle.png)

![Cartera](docs/capturas/cartera.png)

![Cuenta socio](docs/capturas/cuenta-socio.png)

![Reportes](docs/capturas/reportes.png)

![Desayunos del día](docs/capturas/reportes-desayunos.png)

![Reportes financieros](docs/capturas/reportes-financiero.png)

![Usuarios y roles](docs/capturas/configuracion.png)

## Todo desde la raíz

```bash
npm install
npm run dev
```

Levanta la API y la web al mismo tiempo con `concurrently`.

## Guía rápida de prueba 1A

1. Abre caja de recepción.
2. Crea una reserva con anticipo y edítala.
3. Usa el ojo **Ver** para revisar la vista completa: pagos, consumos e historial.
4. Haz check-in desde la reserva.
5. Agrega un cargo y haz check-out.
6. Crea una empresa en Clientes con plan `EMPRESA`, tarifa por noche y vigencia.
7. Crea una reserva a su nombre y verifica que aplique la tarifa negociada.
8. Usa **Reserva grupal** para reservar dos habitaciones con la empresa como pagadora.
9. Haz check-out a crédito, abona en Cartera y revisa Cuenta socio.
10. Abre bar terraza, traslada efectivo a recepción y haz cambio de turno.
11. Genera el cuadre PDF y revisa Reportes.

## Siguiente paso

La 1A está implementada y lista para validación manual. Queda pendiente la
factura consolidada única para una reserva grupal; hoy cada habitación conserva
su folio y su cobro, con el mismo pagador. Después siguen compras, almacenes,
traslados de inventario y crédito de empleados del bar; luego la Fase 1B
(mensualidad, contratos y extensiones).

## Repositorio remoto

`https://github.com/newmagdalenahotel-ux/sinmh` — rama `main`.
