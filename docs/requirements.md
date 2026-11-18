# Requirements — Sistema Hotel New Magdalena

> **Documento vigente.** Los requisitos salen de `SPEC.md` y se implementan en
> el orden de `tasks.md`. Un requisito sin criterio de aceptación no se considera
> terminado. El estado se actualiza al cerrar cada tarea.

**Versión:** 3.0
**Fecha:** 2026-11-18
**Basado en:** SPEC.md v3.0

Cada requisito funcional (FR) tiene descripción, criterio de aceptación, fase y
estado actual: **Hecho**, **Parcial** o **Pendiente**.

---

## Módulo: Autenticación y seguridad

### FR-01 — Login de usuario
**Fase:** actual · **Estado:** Hecho
**Descripción:** El usuario se autentica con username y password; el sistema
devuelve un JWT con usuario y rol.

**Aceptación:**
- `POST /auth/login` con credenciales válidas → 200 + JWT.
- Credenciales inválidas → 401.
- El JWT contiene usuario y rol, y expira en 8 horas.

### FR-02 — Autorización por rol
**Fase:** actual · **Estado:** Hecho
**Descripción:** Los endpoints se protegen por rol: ADMIN, GERENTE, RECEPCION, CAJERO.

**Aceptación:**
- `GET /admin/usuarios` con rol CAJERO → 403.
- `GET /admin/usuarios` con rol ADMIN → 200.

---

## Módulo: Centros y configuración

### FR-03 — Listado de centros
**Fase:** actual · **Estado:** Hecho
**Descripción:** Listar los centros activos con código, nombre y tipo.

**Aceptación:**
- `GET /catalogos/centros` devuelve al menos alojamiento, bar recepción,
  bar terraza, restaurante, eventos, piscina, lavandería y tour.

### FR-04 — Puntos de venta
**Fase:** actual · **Estado:** Hecho
**Descripción:** Cada centro tiene uno o más puntos de venta con su caja.

**Aceptación:**
- `GET /puntos-venta` devuelve código, nombre, centro y capacidades.
- La caja central está asociada a recepción.

---

## Módulo: Clientes y crédito

### FR-05 — CRUD de clientes
**Fase:** 1B · **Estado:** Hecho
**Descripción:** Crear, leer, actualizar y buscar clientes PARTICULAR, EMPRESA,
EMPLEADO, GRUPO_TRABAJO y SOCIO.

**Aceptación:**
- `POST /clientes` → 201.
- `GET /clientes?documento=...` encuentra por documento.
- `PUT /clientes/:id` actualiza.
- `DELETE /clientes/:id` hace soft delete.

### FR-06 — Cupo y días de crédito
**Fase:** 1B · **Estado:** Hecho
**Descripción:** Cada cliente tiene cupo y días de crédito; una venta a crédito
no puede superar el cupo.

**Aceptación:**
- Cupo 500.000 + venta 600.000 → rechazo.
- Cupo 500.000 + venta 400.000 → aceptación.
- Empresa sin tope, con plazo de 8, 15 o 30 días.

---

## Módulo: Caja

### FR-07 — Apertura de caja
**Fase:** actual · **Estado:** Hecho
**Descripción:** Abrir una sesión de caja con monto inicial y responsable.

**Aceptación:**
- `POST /caja/sesiones` → 201.
- Si ya hay una sesión abierta para el POS → 409.
- La sesión queda identificada con el usuario que abre.

### FR-08 — Cierre y arqueo
**Fase:** actual · **Estado:** Hecho
**Descripción:** Al cerrar, el sistema calcula el efectivo esperado y lo compara
con el declarado.

**Aceptación:**
- `POST /caja/sesiones/:id/cerrar` con monto declarado → 200.
- `diferencia = declarado - esperado`.
- Si hay diferencia, queda registrada y autorizada.

### FR-09 — Traslado entre cajas
**Fase:** actual · **Estado:** Hecho
**Descripción:** Trasladar efectivo de una caja a otra, por ejemplo de bar
terraza o restaurante a la caja central.

**Aceptación:**
- `POST /caja/traslados` crea `TRASLADO_SALIDA` y `TRASLADO_ENTRADA`.
- Ambos movimientos comparten `contraparte_sesion_id`.
- El efectivo esperado de ambas sesiones cambia correctamente.

### FR-10 — Gasto en efectivo
**Fase:** actual · **Estado:** Hecho
**Descripción:** Registrar un gasto pagado desde caja, con cuenta, descripción y
soporte.

**Aceptación:**
- `POST /caja/movimientos` tipo `GASTO_EFECTIVO` → 201.
- Se crea movimiento de caja y asiento: debe gasto / haber caja.
- Se guarda descripción y URL del soporte.

### FR-11 — Retiro y aporte del dueño
**Fase:** actual · **Estado:** Hecho
**Descripción:** Registrar retiros y aportes de efectivo del dueño.

**Aceptación:**
- Retiro: movimiento `RETIRO_DUENO` y asiento contra cuenta socio.
- Aporte: movimiento `INGRESO` y asiento contra patrimonio.
- El efectivo esperado se actualiza.

### FR-25 — Cambio de turno
**Fase:** actual · **Estado:** Hecho
**Descripción:** Entregar la caja de un turno a otro con conteo, responsable y
diferencia.

**Aceptación:**
- El saliente declara el efectivo contado.
- El entrante confirma el conteo.
- Se registra quién entrega y quién recibe.
- El nuevo turno inicia con el efectivo contado.
- Si hay diferencia, se registra y se autoriza.

### FR-26 — Ajustes de caja
**Fase:** actual · **Estado:** Hecho
**Descripción:** Registrar faltantes y sobrantes con su asiento contable.

**Aceptación:**
- `AJUSTE_FALTANTE`: debe gasto faltante / haber caja.
- `AJUSTE_SOBRANTE`: debe caja / haber ingreso sobrante.
- El movimiento queda en la sesión.

---

## Módulo: Alojamiento

### FR-12 — Crear reserva
**Fase:** actual · **Estado:** Hecho
**Descripción:** Crear una reserva con fechas, pax, habitación, tarifa, cliente
y anticipo opcional. El anticipo se aplica al check-in. La reserva
multi-habitación queda para 1B.

**Aceptación:**
- `POST /reservas` → 201.
- Valida disponibilidad en las fechas.
- Genera código de reserva; el folio se crea en el check-in.
- Si hay anticipo, crea cobro y asiento, y lo aplica al check-in.
- La reserva multi-habitación queda para 1B.

### FR-27 — Editar y cancelar reserva
**Fase:** actual · **Estado:** Parcial
**Descripción:** Cambiar fechas, habitación o pax; cancelar con política.

**Aceptación:**
- `PUT /reservas/:id` valida disponibilidad.
- `POST /reservas/:id/cancelar` registra motivo y estado.
- Si había anticipo, se registra la devolución o retención.

### FR-28 — Tablero de habitaciones
**Fase:** actual · **Estado:** Hecho
**Descripción:** Ver el estado de las 31 habitaciones rentables en una sola pantalla.

**Aceptación:**
- Muestra libre, ocupada, sucia y mantenimiento.
- Permite filtrar por piso y clima.
- Permite iniciar check-in o limpieza desde la habitación.

### FR-13 — Check-in
**Fase:** actual · **Estado:** Hecho
**Descripción:** Hacer check-in de una reserva o walk-in, capturando huésped,
habitación y folio.

**Aceptación:**
- `POST /checkin` → 200.
- Crea huésped, folio y cargo de alojamiento.
- Actualiza reserva y habitación.
- Si el pago es efectivo, exige caja abierta.

### FR-14 — Cargo manual al folio
**Fase:** actual · **Estado:** Hecho
**Descripción:** Agregar consumos, noches extra, huésped adicional o cortesías.

**Aceptación:**
- `POST /folios/:id/cargos` con concepto, centro y monto → 201.
- Actualiza el saldo y crea asiento.
- Cortesía: monto 0, autorización y motivo.

### FR-15 — Check-out y cobro
**Fase:** actual · **Estado:** Hecho
**Descripción:** Cerrar el folio, cobrar el saldo y liberar la habitación.

**Aceptación:**
- `POST /folios/:id/checkout` → 200.
- Crea cobro y asiento.
- Cierra folio y reserva.
- Genera recibo PDF.

### FR-16 — Cuenta por cobrar a empresa
**Fase:** 1B · **Estado:** Hecho
**Descripción:** Al cerrar un folio de empresa con crédito, crear CxC.

**Aceptación:**
- Check-out con `metodo_pago='CREDITO'` y responsable empresa → 200.
- Crea `cuenta_cobrar` con vencimiento.
- El folio queda cerrado/facturado.

### FR-17 — Abono a cuenta por cobrar
**Fase:** 1B · **Estado:** Hecho
**Descripción:** Registrar abonos a CxC de empresas o empleados.

**Aceptación:**
- `POST /cuentas-cobrar/:id/abonos` → 201.
- Actualiza saldo y estado.
- Crea cobro y asiento.

### FR-18 — Adjuntos
**Fase:** 1C · **Estado:** Pendiente
**Descripción:** Adjuntar facturas, recibos y soportes a movimientos y compras.

**Aceptación:**
- `POST /adjuntos` guarda el archivo y su referencia.
- Se puede consultar desde el movimiento.

---

## Módulo: Bar y servicios

### FR-29 — Productos y almacenes
**Fase:** actual · **Estado:** Parcial
**Descripción:** Administrar productos, categorías, precios, costos y almacenes
central y de subcentros.

**Aceptación:**
- `POST /productos` y `PUT /productos/:id` → 201/200.
- Cada producto tiene centro, unidad, precio y control de inventario.
- Existe almacén central y almacenes de bar terraza y restaurante.

### FR-30 — Compras y entrada de inventario
**Fase:** actual · **Estado:** Pendiente
**Descripción:** Registrar una compra a proveedor y entrar la mercancía al almacén.

**Aceptación:**
- `POST /compras` con proveedor, detalle y total → 201.
- Aumenta el inventario del almacén.
- Si se paga de caja, crea movimiento y asiento.
- Si queda pendiente, crea cuenta por pagar.

### FR-31 — Traslado de inventario
**Fase:** actual · **Estado:** Pendiente
**Descripción:** Mover productos del almacén central a un subcentro.

**Aceptación:**
- `POST /inventario/traslados` con origen, destino y detalle.
- Descuenta origen y aumenta destino.
- Crea dos movimientos de inventario vinculados.

### FR-32 — Stock mínimo
**Fase:** actual · **Estado:** Pendiente
**Descripción:** Alertar cuando un producto baja del stock mínimo.

**Aceptación:**
- El producto tiene stock mínimo.
- El dashboard y la pantalla de bar muestran los productos bajo mínimo.
- La alerta no bloquea la venta, pero queda visible.

### FR-33 — Venta de bar
**Fase:** actual · **Estado:** Hecho
**Descripción:** Vender productos en efectivo, tarjeta, transferencia o cargo a
la habitación.

**Aceptación:**
- `POST /bar/ventas` → 201.
- Descuenta stock y crea detalle.
- Efectivo exige caja; cargo exige folio abierto.
- Genera asiento de ingreso por centro.

### FR-34 — Crédito de empleados
**Fase:** actual · **Estado:** Pendiente
**Descripción:** El empleado consume a crédito con cupo y abonos.

**Aceptación:**
- Venta con cliente EMPLEADO y cupo suficiente → 201.
- Crea CxC y descuenta stock.
- Abono actualiza saldo y estado.

### FR-36 — Pérdidas y cortesías de bar
**Fase:** actual · **Estado:** Pendiente
**Descripción:** Registrar producto dañado, vencido o cortesía autorizada.

**Aceptación:**
- Movimiento de inventario `MERMA` o `PERDIDA` con motivo.
- Cortesía con autorización y costo registrado.
- No se trata como venta.

---

## Módulo: Frontend

### FR-35 — Dashboard y navegación por módulos
**Fase:** actual · **Estado:** Hecho
**Descripción:** El frontend se organiza por módulos y muestra un dashboard con
la información principal del día.

**Aceptación:**
- Menú: Dashboard, Alojamiento, Bar y servicios, Caja, Reportes, Configuración.
- Dashboard muestra ocupación, llegadas, salidas, caja y ventas.
- Cada módulo agrupa sus pantallas y acciones.
- Se usa `design-system.md` sin cambiar la identidad visual.

### FR-38 — Reserva desde la pantalla
**Fase:** actual · **Estado:** Parcial
**Descripción:** Crear y consultar reservas desde Alojamiento, no solo check-in.

**Aceptación:**
- Formulario de reserva con fechas, pax, habitación, tarifa y abono.
- Calendario o lista de reservas.
- Convertir reserva en check-in.
- Editar y cancelar.

### FR-39 — Tablero de habitaciones en la pantalla
**Fase:** actual · **Estado:** Hecho
**Descripción:** Pantalla visual del estado de las habitaciones.

**Aceptación:**
- Muestra las 31 habitaciones rentables.
- Colores por estado.
- Acciones de check-in, limpieza y mantenimiento.

---

## Módulo: Reportes

### FR-19 — Ingresos del día
**Fase:** actual · **Estado:** Hecho
**Aceptación:** `GET /reportes/ingresos?fecha=...` agrupa por centro y cuenta.

### FR-20 — Ocupación
**Fase:** actual · **Estado:** Hecho
**Aceptación:** Devuelve ocupadas, totales y porcentaje.

### FR-21 — Cartera
**Fase:** 1B · **Estado:** Hecho
**Aceptación:** Lista CxC por empresa, con estado y vencimiento.

### FR-22 — Resultado por centro
**Fase:** 1B · **Estado:** Hecho
**Aceptación:** Ingresos, costos y margen por centro y mes.

### FR-23 — Cuadre de caja
**Fase:** actual · **Estado:** Hecho
**Aceptación:** Detalle de movimientos, esperado, declarado y diferencia.

### FR-37 — Libro y desayunos
**Fase:** actual · **Estado:** Hecho
**Aceptación:**
- `GET /reportes/libro?desde=...&hasta=...` muestra debe/haber.
- `GET /reportes/desayunos?fecha=...` lista habitación, huésped, modo y pax.

---

## Módulo: Parametrización

### FR-24 — Seed desde CSV
**Fase:** actual · **Estado:** Hecho
**Aceptación:**
- `npm run seed` carga habitaciones, tarifas y productos.
- Es idempotente.
- Si hay error, hace rollback.

---

## Definición de terminado

Un FR está terminado cuando:

- [ ] Cumple sus criterios de aceptación.
- [ ] Tiene prueba manual documentada.
- [ ] Está reflejado en `design.md` y `tasks.md`.
- [ ] Genera los asientos contables que correspondan.
- [ ] Fue validado por el responsable del proyecto.
