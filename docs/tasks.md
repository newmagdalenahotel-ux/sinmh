# Tasks — Plan por módulos

> **Documento vigente de ejecución.** Cada tarea sale de un requisito de
> `requirements.md` y se implementa en el orden de este archivo. El estado se
> actualiza al terminar la tarea. No se ejecutan tareas sin requisito y criterio
> de aceptación.

**Versión:** 3.0
**Fecha:** 2026-11-18
**Basado en:** SPEC.md v3.0 y requirements.md v3.0

---

## Estado actual

| Módulo | Estado | Observación |
|---|---|---|
| Autenticación, usuarios y roles | Hecho | Admin, gerente, recepción y cajero |
| Habitaciones, tarifas y disponibilidad | Hecho | 33 espacios y 50 tarifas |
| Check-in, folio, cargos y check-out | Hecho | Flujo walk-in probado |
| Contabilidad de doble partida | Parcial | Libro y asientos; falta cierre contable |
| Caja central | Hecho | Apertura, cierre, movimientos, traslados y cambio de turno |
| Reportes | Hecho | Ingresos, ocupación, libro, desayunos, cartera, resultado y cuadre PDF |
| Bar recepción | Parcial | Productos, ventas y stock; faltan almacenes, compras y crédito |
| Reservas | Hecho | Crear, editar, cancelar, check-in y anticipo; multi-habitación en 1B |
| Clientes y crédito | Hecho | Empresas, empleados, grupos, cupo y plazo |
| Cuentas por cobrar y abonos | Hecho | Check-out a crédito y abonos en efectivo, tarjeta o transferencia |
| Cuenta socio | Hecho | Aportes y retiros del dueño |
| Dashboard y navegación por módulos | Hecho | Dashboard y menú agrupado por módulos |
| Tablero de habitaciones | Hecho | Estados, filtros y cambio de limpieza |
| Cambio de turno y traslados de caja | Hecho | Conteo, nuevo turno y traslados entre cajas |

---

## Bloque 1 — Documentación y base

### T1.1 — Documentos reconciliados
**Estado:** Hecho
**Objetivo:** Dejar cinco documentos como única fuente: SPEC, requirements,
design, design-system y tasks.

**Aceptación:**
- [x] Los cinco documentos existen y no tienen encabezados de “histórico”.
- [x] No hay documentos paralelos de alcance, procesos o decisiones.
- [x] El mapa de módulos está en `design.md`.

### T1.2 — Migraciones y seed
**Estado:** Hecho
**Objetivo:** Base local con migraciones 001–009 y seed idempotente.

**Aceptación:**
- [x] `npm run migrate` corre limpio.
- [x] `npm run seed` carga habitaciones, tarifas, cuentas y productos.
- [x] El build de backend y frontend pasa.

---

## Bloque 2 — Núcleo

### T2.1 — Autenticación y roles
**Estado:** Hecho
**Requisitos:** FR-01, FR-02

**Aceptación:**
- [x] Login con JWT de 8 horas.
- [x] Rutas de administración solo para ADMIN.
- [x] CRUD de usuarios y cambio de rol.

### T2.2 — Catálogos y contabilidad
**Estado:** Hecho
**Requisitos:** FR-03, FR-04

**Aceptación:**
- [x] Centros y puntos de venta.
- [x] Plan de cuentas.
- [x] Asientos automáticos de check-in, cobro, cargos, bar y caja.
- [x] Todo asiento cuadrado.

---

## Bloque 3 — Alojamiento

### T3.1 — API de reservas
**Estado:** Hecho
**Requisitos:** FR-12, FR-27

**Pasos:**
1. Crear reserva con cliente, fechas, pax, habitación y tarifa.
2. Validar disponibilidad.
3. Generar código; el folio se crea en el check-in.
4. Editar fechas, habitación o pax.
5. Cancelar con motivo y política de anticipo.

**Aceptación:**
- [x] `POST /reservas` crea la reserva.
- [x] `POST /reservas/:id/checkin` crea el folio.
- [x] `PUT /reservas/:id` valida disponibilidad.
- [x] `POST /reservas/:id/cancelar` cambia el estado.
- [x] Anticipo genera cobro, asiento y se aplica al check-in.

### T3.2 — Pantalla de reservas
**Estado:** Hecho
**Requisitos:** FR-38

**Pasos:**
1. Lista de reservas con estado.
2. Formulario de creación.
3. Búsqueda por código, cliente o documento.
4. Acción “convertir en check-in”.

**Aceptación:**
- [x] Se crea una reserva desde la pantalla.
- [x] Se consulta por estado o búsqueda.
- [x] Se editan fechas, habitación, pax, temporada, escenario y desayuno.
- [x] Se convierte en check-in sin volver a capturar datos.
- [x] Se registra anticipo desde la pantalla.

### T3.3 — Tablero de habitaciones
**Estado:** Hecho
**Requisitos:** FR-28, FR-39

**Pasos:**
1. Vista de las 31 habitaciones por piso.
2. Estados: libre, ocupada, sucia, mantenimiento.
3. Acciones desde la habitación.

**Aceptación:**
- [x] Se ve el estado de todas las habitaciones.
- [x] Se inicia check-in desde una habitación libre.
- [x] Se marca limpieza o mantenimiento.

### T3.4 — Check-in, folio, cargos y check-out
**Estado:** Hecho
**Requisitos:** FR-13, FR-14, FR-15

**Aceptación:**
- [x] Check-in walk-in con folio y cargo de alojamiento.
- [x] Cargos manuales con centro y asiento.
- [x] Check-out con cobro y cierre.
- [x] Recibo PDF.

### T3.5 — Desayuno y recibo
**Estado:** Hecho
**Requisitos:** FR-37

**Aceptación:**
- [x] Desayuno incluido o pagado.
- [x] Reporte de desayunos por fecha.
- [x] PDF de recibo de caja.

### T3.6 — Contrato y multi-habitación
**Estado:** Parcial
**Fase:** 1A/1B

**Aceptación:**
- [x] Contrato básico de hospedaje en PDF.
- [ ] Reserva con varias habitaciones y huéspedes.
- [ ] Responsable de pago por folio.

---

## Bloque 4 — Bar y servicios

### T4.1 — Productos y almacenes
**Estado:** Parcial
**Requisitos:** FR-29

**Pasos:**
1. Agregar almacén central y almacenes de subcentros.
2. Relacionar producto con almacén.
3. Pantalla de alta y edición de productos.

**Aceptación:**
- [ ] Producto con centro, unidad, precio, costo y stock mínimo.
- [ ] Existen almacén central, bar terraza y restaurante.
- [ ] Se crea y edita un producto desde la pantalla.

### T4.2 — Compras y entrada de inventario
**Estado:** Pendiente
**Requisitos:** FR-30

**Pasos:**
1. Proveedor y compra con detalle.
2. Entrada al almacén.
3. Pago desde caja o cuenta por pagar.

**Aceptación:**
- [ ] `POST /compras` crea compra y aumenta inventario.
- [ ] Si se paga de caja, crea movimiento y asiento.
- [ ] Si queda pendiente, crea cuenta por pagar.

### T4.3 — Traslado de inventario
**Estado:** Pendiente
**Requisitos:** FR-31

**Aceptación:**
- [ ] `POST /inventario/traslados` mueve productos entre almacenes.
- [ ] Descuenta origen y aumenta destino.
- [ ] Crea dos movimientos vinculados.

### T4.4 — Venta de bar
**Estado:** Hecho
**Requisitos:** FR-33

**Aceptación:**
- [x] Venta en efectivo, tarjeta, transferencia o cargo a habitación.
- [x] Descuenta stock.
- [x] Genera asiento de ingreso.

### T4.5 — Crédito de empleados
**Estado:** Pendiente
**Requisitos:** FR-34

**Aceptación:**
- [ ] Venta a crédito con cupo.
- [ ] CxC por empleado.
- [ ] Abono y actualización de saldo.

### T4.6 — Pérdidas y cortesías
**Estado:** Pendiente
**Requisitos:** FR-36

**Aceptación:**
- [ ] Merma o pérdida con motivo.
- [ ] Cortesía autorizada con costo.
- [ ] No se registra como venta.

---

## Bloque 5 — Caja

### T5.1 — Apertura, cierre y movimientos
**Estado:** Hecho
**Requisitos:** FR-07, FR-08, FR-10, FR-11, FR-26

**Aceptación:**
- [x] Apertura y cierre con diferencia.
- [x] Gastos, retiros, aportes y ajustes.
- [x] Asientos contables.

### T5.2 — Cambio de turno
**Estado:** Hecho
**Requisitos:** FR-25

**Pasos:**
1. El saliente declara el efectivo contado.
2. El entrante confirma el conteo.
3. Se registra quién entrega y quién recibe.
4. Se abre el nuevo turno con el efectivo contado.

**Aceptación:**
- [x] Cambio de turno con conteo y responsables.
- [x] Diferencia registrada y autorizada.
- [x] El nuevo turno inicia con el saldo correcto.

### T5.3 — Traslados entre cajas
**Estado:** Hecho
**Requisitos:** FR-09

**Aceptación:**
- [x] `POST /caja/traslados` crea salida y entrada vinculadas.
- [x] El efectivo esperado de ambas cajas cambia.
- [x] Se ve en el cuadre del turno.

### T5.4 — Reporte de cuadre
**Estado:** Hecho
**Requisitos:** FR-23

**Aceptación:**
- [x] La pantalla de cierre muestra esperado, declarado y diferencia.
- [x] Reporte PDF del cuadre por turno.

---

## Bloque 6 — Frontend por módulos

### T6.1 — Navegación por módulos
**Estado:** Hecho
**Requisitos:** FR-35

**Pasos:**
1. Sidebar: Dashboard, Alojamiento, Bar y servicios, Caja, Reportes, Configuración.
2. Rutas anidadas por módulo.
3. Mover check-in, huéspedes y folios a Alojamiento.
4. Mover bar a Bar y servicios.

**Aceptación:**
- [x] El menú coincide con `design.md`.
- [x] La marca del sidebar es “Sistema de Información New Magdalena Hotel”.
- [x] El topbar muestra el breadcrumb módulo / pantalla.
- [x] El topbar muestra la descripción de la pantalla.
- [x] El encabezado no se repite en el contenido.
- [x] Cada módulo agrupa sus pantallas.
- [x] Las rutas actuales siguen funcionando.
- [x] Las secciones se despliegan como acordeón y solo una queda abierta.
- [x] Al entrar a un módulo directo se cierran las secciones abiertas.
- [x] Los módulos de un solo ítem son enlace directo.
- [x] En móvil el menú funciona como drawer.

### T6.2 — Dashboard
**Estado:** Hecho
**Requisitos:** FR-35

**Aceptación:**
- [x] Ocupación, llegadas, salidas, caja y ventas del día.
- [x] Alertas de caja cerrada, stock bajo y habitaciones sucias.

### T6.3 — Redirecciones y compatibilidad
**Estado:** Hecho

**Aceptación:**
- [x] `/checkin`, `/folios` y `/bar` siguen funcionando.
- [x] No se rompen enlaces existentes.

---

## Bloque 7 — Reportes

### T7.1 — Ingresos, ocupación, libro y desayunos
**Estado:** Hecho
**Requisitos:** FR-19, FR-20, FR-37

**Aceptación:**
- [x] Reportes con fecha.
- [x] Libro con debe y haber.
- [x] Desayunos por habitación y pax.

### T7.2 — Cartera y resultado por centro
**Estado:** Pendiente
**Fase:** 1B
**Requisitos:** FR-21, FR-22

### T7.3 — Cuadre PDF
**Estado:** Pendiente
**Requisitos:** FR-23

---

## Bloque 8 — Pruebas manuales y cierre

### T8.1 — Guion de prueba de alojamiento
**Estado:** Parcial

**Guion:**
1. Crear reserva.
2. Hacer check-in.
3. Agregar cargo de bar al folio.
4. Hacer check-out.
5. Generar recibo.

**Aceptación:**
- [x] Crear reserva, check-in y check-out sin cargar datos a mano.
- [x] Los saldos cuadran.
- [ ] Cargo de bar al folio dentro del mismo guion.
- [ ] Recibo del folio creado desde reserva.

### T8.2 — Guion de bar
**Estado:** Pendiente

**Guion:**
1. Crear producto.
2. Registrar compra y entrada.
3. Trasladar a subcentro.
4. Vender en efectivo.
5. Vender a crédito a empleado.
6. Revisar stock y cartera.

### T8.3 — Guion de caja
**Estado:** Parcial

**Guion:**
1. Abrir caja.
2. Venta en efectivo.
3. Gasto y retiro.
4. Cambio de turno.
5. Cierre y cuadre.

**Aceptación:**
- [x] Apertura, transferencia entre cajas y cambio de turno.
- [ ] Cierre final del nuevo turno con cuadre.

---

## Bloque 9 — 1A financiera

### T9.1 — Clientes y crédito
**Estado:** Hecho
**Requisitos:** FR-05, FR-06

**Aceptación:**
- [x] Crear empresas, empleados, grupos y particulares.
- [x] Buscar y editar cupo y días de crédito.
- [x] El cupo se valida en el check-out a crédito.

### T9.2 — Cuentas por cobrar y abonos
**Estado:** Hecho
**Requisitos:** FR-16, FR-17, FR-21

**Aceptación:**
- [x] Check-out a crédito de empresa, empleado o grupo.
- [x] CxC con vencimiento y estado.
- [x] Abonos en efectivo, tarjeta o transferencia.
- [x] Cartera con saldo total.

### T9.3 — Cuenta socio
**Estado:** Hecho
**Requisitos:** FR-11

**Aceptación:**
- [x] Aportes y retiros del dueño.
- [x] Saldo acumulado.
- [x] Movimientos visibles en pantalla.

### T9.4 — Reportes financieros
**Estado:** Hecho
**Requisitos:** FR-22, FR-23

**Aceptación:**
- [x] Cartera por empresa.
- [x] Resultado por centro del mes.
- [x] Cuadre de caja en PDF.

### T9.5 — Cierre T1.28
**Estado:** Parcial

**Aceptación:**
- [x] Clientes, CxC, abonos y cuenta socio probados.
- [x] Reportes de ingresos, cartera, resultado y cuadre.
- [x] Tablero de habitaciones y dashboard.
- [ ] Manual de recepción actualizado.
- [ ] Validación manual del responsable.

---

## Bloque 10 — UX de formularios y dinero

### T10.1 — Formato de dinero
**Estado:** Hecho

**Aceptación:**
- [x] Componente `MoneyInput` con separador de miles.
- [x] Reserva, abono, caja, check-in, cargos y cupo usan el componente.
- [x] El valor se envía como número, no como texto formateado.
- [x] Los montos de solo lectura siguen usando `formatoMoneda`.

### T10.2 — Toasts auto-descartables
**Estado:** Hecho

**Aceptación:**
- [x] Proveedor global de notificaciones.
- [x] Éxito desaparece en 4 segundos.
- [x] Error permanece más tiempo y se puede cerrar.
- [x] No tapan los botones de acción principales.
- [x] Reservas, clientes, caja, bar, folios, cartera, habitaciones, reportes y configuración usan toast.
- [x] Los errores de formulario se muestran abajo a la derecha y por encima del panel.

### T10.3 — Formularios en panel ancho
**Estado:** Hecho

**Aceptación:**
- [x] Nueva reserva, editar reserva y check-in desde reserva en slide-over.
- [x] Cliente nuevo y edición en slide-over.
- [x] Reserva grupal en slide-over.
- [x] Fondo oscurecido con desenfoque.
- [x] Altura completa, portal a `body`, flecha atrás, título y botón Cerrar.
- [x] En móvil ocupa el ancho completo.
- [x] Cierra con Escape o clic en el fondo.
- [x] Vista de reserva, grupo y cliente se abren en el mismo panel.

---

## Bloque 11 — Cliente, tarifas y grupos

### T11.1 — Ficha de cliente y estadía
**Estado:** Hecho

**Aceptación:**
- [x] Cliente con dirección, ciudad, notas, email y teléfono.
- [x] Reserva con motivo de visita y origen; la placa se registra en check-in.
- [x] Panel de cliente para crear y editar.
- [x] Los campos de estadía quedan en la reserva.

### T11.2 — Planes de tarifa
**Estado:** Hecho

**Aceptación:**
- [x] Plan público, empresa, empleado y grupo.
- [x] Precio negociado por noche y vigencia.
- [x] Desayuno incluido por plan.
- [x] La reserva aplica la tarifa vigente y guarda el precio aplicado.
- [x] La pantalla de reserva muestra la tarifa del cliente.

### T11.3 — Reserva maestra y pagador
**Estado:** Hecho

**Aceptación:**
- [x] Migración `reserva_maestra` y `reserva.maestra_id`.
- [x] Endpoint para crear grupo con varias habitaciones.
- [x] Código maestro y código independiente por habitación.
- [x] Payer único para todas las hijas.
- [x] Huésped, documento, pax y desayuno por habitación.
- [x] Origen de la reserva.
- [x] Consulta y cancelación del grupo.
- [x] Check-in y check-out por habitación.
- [ ] Anticipo consolidado y factura única del grupo (fase 1B).

### T11.4 — Pantalla compacta de reservas
**Estado:** Hecho

**Aceptación:**
- [x] Barra con búsqueda, filtro, reserva grupal, check-in directo y nueva reserva.
- [x] Tabla con huésped, habitación y ocupantes, estancia, valor/anticipo/saldo y estado.
- [x] Sin iniciales ni icono de cama; la ocupación va en la habitación.
- [x] Acciones por fila con iconos y etiquetas accesibles.
- [x] Paginación de 10, 20 o 50 filas.
- [x] Búsqueda con espera de 350 ms.
- [x] Se retiraron las ayudas contextuales.
- [x] Fecha de creación con hora.
- [x] Filtros Reservadas, En casa, Check-out, Canceladas y No show.
- [x] Check-in fuera del menú; queda como acción y “Check-in sin reserva”.
- [x] Formulario de reserva en 3 pasos.
- [x] Tarjetas de habitaciones en 2–4 columnas, con disponibles y bloqueadas por motivo.
- [x] Por defecto solo disponibles; enlace para ver las no disponibles.
- [x] Estados **En casa** y **Reservada** con prioridad sobre la falta de acomodación.
- [x] Aviso de limpieza pendiente.
- [x] Validación por campo con mensaje y borde; correo y teléfono validados.
- [x] Buscador de cliente existente.
- [x] Pagos divididos y anticipo opcional.
- [x] Validación de nombre, motivo y teléfono/correo.
- [x] Motivo turismo/corporativo y origen de la reserva.
- [x] Acción “Ver” abre el detalle en el panel.

### T11.5 — Vista completa de la reserva
**Estado:** Hecho

**Aceptación:**
- [x] Endpoint `GET /reservas/:id/detalle`.
- [x] Página `/reservas/:id`.
- [x] Estadía, huésped, pagador y tarifa.
- [x] Consumos y pagos con fecha y usuario.
- [x] Cuentas por cobrar e historial.
- [x] Check-in y check-out con hora.

### T11.6 — Layout estándar de detalle
**Estado:** Hecho

**Aceptación:**
- [x] Componente `RecordLayout` con contenido principal y panel derecho fijo.
- [x] Reserva, grupo y cliente usan el mismo layout.
- [x] El panel baja debajo del contenido en móvil.
- [x] Listas y formularios conservan su propio layout.

### T11.6 — Uso parcial autorizado
**Estado:** Hecho

**Aceptación:**
- [x] Migración `018_uso_parcial.sql`.
- [x] La API marca habitaciones grandes que requieren autorización.
- [x] Solo `ADMIN` y `GERENTE` autorizan.
- [x] Motivo obligatorio.
- [x] Se registra autorizador y fecha.
- [x] Precio según pax reales.
- [x] La reserva muestra el uso parcial en el detalle.

---

## Orden de ejecución

1. **T4.1, T4.2, T4.3, T4.5 y T4.6:** almacenes, compras, traslados y crédito de bar.
2. **T9.5:** manual de recepción y validación manual de la 1A.
3. **Fase 1B:** mensualidad, contratos, extensiones y cambios de habitación.

Cada tarea se marca como Hecha solo cuando cumple sus criterios y queda probada
manualmente.
