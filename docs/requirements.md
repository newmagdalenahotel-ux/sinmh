# Requirements â€” Sistema Hotel New Magdalena

> **Documento vigente.** Los requisitos salen de `SPEC.md` y se implementan en
> el orden de `tasks.md`. Un requisito sin criterio de aceptaciÃ³n no se considera
> terminado. El estado se actualiza al cerrar cada tarea.

**VersiÃ³n:** 3.0
**Fecha:** 2026-11-18
**Basado en:** SPEC.md v3.0

Cada requisito funcional (FR) tiene descripciÃ³n, criterio de aceptaciÃ³n, fase y
estado actual: **Hecho**, **Parcial** o **Pendiente**.

---

## MÃ³dulo: AutenticaciÃ³n y seguridad

### FR-01 â€” Login de usuario
**Fase:** actual Â· **Estado:** Hecho
**DescripciÃ³n:** El usuario se autentica con username y password; el sistema
devuelve un JWT con usuario y rol.

**AceptaciÃ³n:**
- `POST /auth/login` con credenciales vÃ¡lidas â†’ 200 + JWT.
- Credenciales invÃ¡lidas â†’ 401.
- El JWT contiene usuario y rol, y expira en 8 horas.

### FR-02 â€” AutorizaciÃ³n por rol
**Fase:** actual Â· **Estado:** Hecho
**DescripciÃ³n:** Los endpoints se protegen por rol: ADMIN, GERENTE, RECEPCION, CAJERO.

**AceptaciÃ³n:**
- `GET /admin/usuarios` con rol CAJERO â†’ 403.
- `GET /admin/usuarios` con rol ADMIN â†’ 200.

---

## MÃ³dulo: Centros y configuraciÃ³n

### FR-03 â€” Listado de centros
**Fase:** actual Â· **Estado:** Hecho
**DescripciÃ³n:** Listar los centros activos con cÃ³digo, nombre y tipo.

**AceptaciÃ³n:**
- `GET /catalogos/centros` devuelve al menos alojamiento, bar recepciÃ³n,
  bar terraza, restaurante, eventos, piscina, lavanderÃ­a y tour.

### FR-04 â€” Puntos de venta
**Fase:** actual Â· **Estado:** Parcial
**DescripciÃ³n:** Cada centro tiene uno o mÃ¡s puntos de venta con su caja.

**AceptaciÃ³n:**
- `GET /puntos-venta` devuelve cÃ³digo, nombre, centro y capacidades.
- La caja central estÃ¡ asociada a recepciÃ³n.

---

## MÃ³dulo: Clientes y crÃ©dito

### FR-05 â€” CRUD de clientes
**Fase:** 1B Â· **Estado:** Pendiente
**DescripciÃ³n:** Crear, leer, actualizar y buscar clientes PARTICULAR, EMPRESA,
EMPLEADO, GRUPO_TRABAJO y SOCIO.

**AceptaciÃ³n:**
- `POST /clientes` â†’ 201.
- `GET /clientes?documento=...` encuentra por documento.
- `PUT /clientes/:id` actualiza.
- `DELETE /clientes/:id` hace soft delete.

### FR-06 â€” Cupo y dÃ­as de crÃ©dito
**Fase:** 1B Â· **Estado:** Pendiente
**DescripciÃ³n:** Cada cliente tiene cupo y dÃ­as de crÃ©dito; una venta a crÃ©dito
no puede superar el cupo.

**AceptaciÃ³n:**
- Cupo 500.000 + venta 600.000 â†’ rechazo.
- Cupo 500.000 + venta 400.000 â†’ aceptaciÃ³n.
- Empresa sin tope, con plazo de 8, 15 o 30 dÃ­as.

---

## MÃ³dulo: Caja

### FR-07 â€” Apertura de caja
**Fase:** actual Â· **Estado:** Hecho
**DescripciÃ³n:** Abrir una sesiÃ³n de caja con monto inicial y responsable.

**AceptaciÃ³n:**
- `POST /caja/sesiones` â†’ 201.
- Si ya hay una sesiÃ³n abierta para el POS â†’ 409.
- La sesiÃ³n queda identificada con el usuario que abre.

### FR-08 â€” Cierre y arqueo
**Fase:** actual Â· **Estado:** Hecho
**DescripciÃ³n:** Al cerrar, el sistema calcula el efectivo esperado y lo compara
con el declarado.

**AceptaciÃ³n:**
- `POST /caja/sesiones/:id/cerrar` con monto declarado â†’ 200.
- `diferencia = declarado - esperado`.
- Si hay diferencia, queda registrada y autorizada.

### FR-09 â€” Traslado entre cajas
**Fase:** actual Â· **Estado:** Pendiente
**DescripciÃ³n:** Trasladar efectivo de una caja a otra, por ejemplo de bar
terraza o restaurante a la caja central.

**AceptaciÃ³n:**
- `POST /caja/traslados` crea `TRASLADO_SALIDA` y `TRASLADO_ENTRADA`.
- Ambos movimientos comparten `contraparte_sesion_id`.
- El efectivo esperado de ambas sesiones cambia correctamente.

### FR-10 â€” Gasto en efectivo
**Fase:** actual Â· **Estado:** Hecho
**DescripciÃ³n:** Registrar un gasto pagado desde caja, con cuenta, descripciÃ³n y
soporte.

**AceptaciÃ³n:**
- `POST /caja/movimientos` tipo `GASTO_EFECTIVO` â†’ 201.
- Se crea movimiento de caja y asiento: debe gasto / haber caja.
- Se guarda descripciÃ³n y URL del soporte.

### FR-11 â€” Retiro y aporte del dueÃ±o
**Fase:** actual Â· **Estado:** Hecho
**DescripciÃ³n:** Registrar retiros y aportes de efectivo del dueÃ±o.

**AceptaciÃ³n:**
- Retiro: movimiento `RETIRO_DUENO` y asiento contra cuenta socio.
- Aporte: movimiento `INGRESO` y asiento contra patrimonio.
- El efectivo esperado se actualiza.

### FR-25 â€” Cambio de turno
**Fase:** actual Â· **Estado:** Pendiente
**DescripciÃ³n:** Entregar la caja de un turno a otro con conteo, responsable y
diferencia.

**AceptaciÃ³n:**
- El saliente declara el efectivo contado.
- El entrante confirma el conteo.
- Se registra quiÃ©n entrega y quiÃ©n recibe.
- El nuevo turno inicia con el efectivo contado.
- Si hay diferencia, se registra y se autoriza.

### FR-26 â€” Ajustes de caja
**Fase:** actual Â· **Estado:** Hecho
**DescripciÃ³n:** Registrar faltantes y sobrantes con su asiento contable.

**AceptaciÃ³n:**
- `AJUSTE_FALTANTE`: debe gasto faltante / haber caja.
- `AJUSTE_SOBRANTE`: debe caja / haber ingreso sobrante.
- El movimiento queda en la sesiÃ³n.

---

## MÃ³dulo: Alojamiento

### FR-12 â€” Crear reserva
**Fase:** actual Â· **Estado:** Parcial
**DescripciÃ³n:** Crear una reserva con fechas, pax, habitaciÃ³n, tarifa, cliente
y anticipo opcional.

**AceptaciÃ³n:**
- `POST /reservas` â†’ 201.
- Valida disponibilidad en las fechas.
- Genera cÃ³digo de reserva y folio.
- Si hay anticipo, crea cobro y asiento.
- Permite reserva multi-habitaciÃ³n.

### FR-27 â€” Editar y cancelar reserva
**Fase:** actual Â· **Estado:** Pendiente
**DescripciÃ³n:** Cambiar fechas, habitaciÃ³n o pax; cancelar con polÃ­tica.

**AceptaciÃ³n:**
- `PUT /reservas/:id` valida disponibilidad.
- `POST /reservas/:id/cancelar` registra motivo y estado.
- Si habÃ­a anticipo, se registra la devoluciÃ³n o retenciÃ³n.

### FR-28 â€” Tablero de habitaciones
**Fase:** actual Â· **Estado:** Pendiente
**DescripciÃ³n:** Ver el estado de las 31 habitaciones rentables en una sola pantalla.

**AceptaciÃ³n:**
- Muestra libre, ocupada, sucia y mantenimiento.
- Permite filtrar por piso y clima.
- Permite iniciar check-in o limpieza desde la habitaciÃ³n.

### FR-13 â€” Check-in
**Fase:** actual Â· **Estado:** Hecho
**DescripciÃ³n:** Hacer check-in de una reserva o walk-in, capturando huÃ©sped,
habitaciÃ³n y folio.

**AceptaciÃ³n:**
- `POST /checkin` â†’ 200.
- Crea huÃ©sped, folio y cargo de alojamiento.
- Actualiza reserva y habitaciÃ³n.
- Si el pago es efectivo, exige caja abierta.

### FR-14 â€” Cargo manual al folio
**Fase:** actual Â· **Estado:** Hecho
**DescripciÃ³n:** Agregar consumos, noches extra, huÃ©sped adicional o cortesÃ­as.

**AceptaciÃ³n:**
- `POST /folios/:id/cargos` con concepto, centro y monto â†’ 201.
- Actualiza el saldo y crea asiento.
- CortesÃ­a: monto 0, autorizaciÃ³n y motivo.

### FR-15 â€” Check-out y cobro
**Fase:** actual Â· **Estado:** Hecho
**DescripciÃ³n:** Cerrar el folio, cobrar el saldo y liberar la habitaciÃ³n.

**AceptaciÃ³n:**
- `POST /folios/:id/checkout` â†’ 200.
- Crea cobro y asiento.
- Cierra folio y reserva.
- Genera recibo PDF.

### FR-16 â€” Cuenta por cobrar a empresa
**Fase:** 1B Â· **Estado:** Pendiente
**DescripciÃ³n:** Al cerrar un folio de empresa con crÃ©dito, crear CxC.

**AceptaciÃ³n:**
- Check-out con `metodo_pago='CREDITO'` y responsable empresa â†’ 200.
- Crea `cuenta_cobrar` con vencimiento.
- El folio queda cerrado/facturado.

### FR-17 â€” Abono a cuenta por cobrar
**Fase:** 1B Â· **Estado:** Pendiente
**DescripciÃ³n:** Registrar abonos a CxC de empresas o empleados.

**AceptaciÃ³n:**
- `POST /cuentas-cobrar/:id/abonos` â†’ 201.
- Actualiza saldo y estado.
- Crea cobro y asiento.

### FR-18 â€” Adjuntos
**Fase:** 1C Â· **Estado:** Pendiente
**DescripciÃ³n:** Adjuntar facturas, recibos y soportes a movimientos y compras.

**AceptaciÃ³n:**
- `POST /adjuntos` guarda el archivo y su referencia.
- Se puede consultar desde el movimiento.

---

## MÃ³dulo: Bar y servicios

### FR-29 â€” Productos y almacenes
**Fase:** actual Â· **Estado:** Parcial
**DescripciÃ³n:** Administrar productos, categorÃ­as, precios, costos y almacenes
central y de subcentros.

**AceptaciÃ³n:**
- `POST /productos` y `PUT /productos/:id` â†’ 201/200.
- Cada producto tiene centro, unidad, precio y control de inventario.
- Existe almacÃ©n central y almacenes de bar terraza y restaurante.

### FR-30 â€” Compras y entrada de inventario
**Fase:** actual Â· **Estado:** Pendiente
**DescripciÃ³n:** Registrar una compra a proveedor y entrar la mercancÃ­a al almacÃ©n.

**AceptaciÃ³n:**
- `POST /compras` con proveedor, detalle y total â†’ 201.
- Aumenta el inventario del almacÃ©n.
- Si se paga de caja, crea movimiento y asiento.
- Si queda pendiente, crea cuenta por pagar.

### FR-31 â€” Traslado de inventario
**Fase:** actual Â· **Estado:** Pendiente
**DescripciÃ³n:** Mover productos del almacÃ©n central a un subcentro.

**AceptaciÃ³n:**
- `POST /inventario/traslados` con origen, destino y detalle.
- Descuenta origen y aumenta destino.
- Crea dos movimientos de inventario vinculados.

### FR-32 â€” Stock mÃ­nimo
**Fase:** actual Â· **Estado:** Pendiente
**DescripciÃ³n:** Alertar cuando un producto baja del stock mÃ­nimo.

**AceptaciÃ³n:**
- El producto tiene stock mÃ­nimo.
- El dashboard y la pantalla de bar muestran los productos bajo mÃ­nimo.
- La alerta no bloquea la venta, pero queda visible.

### FR-33 â€” Venta de bar
**Fase:** actual Â· **Estado:** Hecho
**DescripciÃ³n:** Vender productos en efectivo, tarjeta, transferencia o cargo a
la habitaciÃ³n.

**AceptaciÃ³n:**
- `POST /bar/ventas` â†’ 201.
- Descuenta stock y crea detalle.
- Efectivo exige caja; cargo exige folio abierto.
- Genera asiento de ingreso por centro.

### FR-34 â€” CrÃ©dito de empleados
**Fase:** actual Â· **Estado:** Pendiente
**DescripciÃ³n:** El empleado consume a crÃ©dito con cupo y abonos.

**AceptaciÃ³n:**
- Venta con cliente EMPLEADO y cupo suficiente â†’ 201.
- Crea CxC y descuenta stock.
- Abono actualiza saldo y estado.

### FR-36 â€” PÃ©rdidas y cortesÃ­as de bar
**Fase:** actual Â· **Estado:** Pendiente
**DescripciÃ³n:** Registrar producto daÃ±ado, vencido o cortesÃ­a autorizada.

**AceptaciÃ³n:**
- Movimiento de inventario `MERMA` o `PERDIDA` con motivo.
- CortesÃ­a con autorizaciÃ³n y costo registrado.
- No se trata como venta.

---

## MÃ³dulo: Frontend

### FR-35 â€” Dashboard y navegaciÃ³n por mÃ³dulos
**Fase:** actual Â· **Estado:** Pendiente
**DescripciÃ³n:** El frontend se organiza por mÃ³dulos y muestra un dashboard con
la informaciÃ³n principal del dÃ­a.

**AceptaciÃ³n:**
- MenÃº: Dashboard, Alojamiento, Bar y servicios, Caja, Reportes, ConfiguraciÃ³n.
- Dashboard muestra ocupaciÃ³n, llegadas, salidas, caja y ventas.
- Cada mÃ³dulo agrupa sus pantallas y acciones.
- Se usa `design-system.md` sin cambiar la identidad visual.

### FR-38 â€” Reserva desde la pantalla
**Fase:** actual Â· **Estado:** Pendiente
**DescripciÃ³n:** Crear y consultar reservas desde Alojamiento, no solo check-in.

**AceptaciÃ³n:**
- Formulario de reserva con fechas, pax, habitaciÃ³n, tarifa y abono.
- Calendario o lista de reservas.
- Convertir reserva en check-in.
- Editar y cancelar.

### FR-39 â€” Tablero de habitaciones en la pantalla
**Fase:** actual Â· **Estado:** Pendiente
**DescripciÃ³n:** Pantalla visual del estado de las habitaciones.

**AceptaciÃ³n:**
- Muestra las 31 habitaciones rentables.
- Colores por estado.
- Acciones de check-in, limpieza y mantenimiento.

---

## MÃ³dulo: Reportes

### FR-19 â€” Ingresos del dÃ­a
**Fase:** actual Â· **Estado:** Hecho
**AceptaciÃ³n:** `GET /reportes/ingresos?fecha=...` agrupa por centro y cuenta.

### FR-20 â€” OcupaciÃ³n
**Fase:** actual Â· **Estado:** Hecho
**AceptaciÃ³n:** Devuelve ocupadas, totales y porcentaje.

### FR-21 â€” Cartera
**Fase:** 1B Â· **Estado:** Pendiente
**AceptaciÃ³n:** Lista CxC por empresa, con estado y vencimiento.

### FR-22 â€” Resultado por centro
**Fase:** 1B Â· **Estado:** Pendiente
**AceptaciÃ³n:** Ingresos, costos y margen por centro y mes.

### FR-23 â€” Cuadre de caja
**Fase:** actual Â· **Estado:** Parcial
**AceptaciÃ³n:** Detalle de movimientos, esperado, declarado y diferencia.

### FR-37 â€” Libro y desayunos
**Fase:** actual Â· **Estado:** Hecho
**AceptaciÃ³n:**
- `GET /reportes/libro?desde=...&hasta=...` muestra debe/haber.
- `GET /reportes/desayunos?fecha=...` lista habitaciÃ³n, huÃ©sped, modo y pax.

---

## MÃ³dulo: ParametrizaciÃ³n

### FR-24 â€” Seed desde CSV
**Fase:** actual Â· **Estado:** Hecho
**AceptaciÃ³n:**
- `npm run seed` carga habitaciones, tarifas y productos.
- Es idempotente.
- Si hay error, hace rollback.

---

## DefiniciÃ³n de terminado

Un FR estÃ¡ terminado cuando:

- [ ] Cumple sus criterios de aceptaciÃ³n.
- [ ] Tiene prueba manual documentada.
- [ ] EstÃ¡ reflejado en `design.md` y `tasks.md`.
- [ ] Genera los asientos contables que correspondan.
- [ ] Fue validado por el responsable del proyecto.
