# Tasks â€” Plan por mÃ³dulos

> **Documento vigente de ejecuciÃ³n.** Cada tarea sale de un requisito de
> `requirements.md` y se implementa en el orden de este archivo. El estado se
> actualiza al terminar la tarea. No se ejecutan tareas sin requisito y criterio
> de aceptaciÃ³n.

**VersiÃ³n:** 3.0
**Fecha:** 2026-11-18
**Basado en:** SPEC.md v3.0 y requirements.md v3.0

---

## Estado actual

| MÃ³dulo | Estado | ObservaciÃ³n |
|---|---|---|
| AutenticaciÃ³n, usuarios y roles | Hecho | Admin, gerente, recepciÃ³n y cajero |
| Habitaciones, tarifas y disponibilidad | Hecho | 33 espacios y 50 tarifas |
| Check-in, folio, cargos y check-out | Hecho | Flujo walk-in probado |
| Contabilidad de doble partida | Parcial | Libro y asientos; falta cuenta socio |
| Caja central | Hecho | Apertura, cierre, gastos, retiros, aportes y ajustes |
| Reportes | Parcial | Ingresos, ocupaciÃ³n, libro y desayunos |
| Bar recepciÃ³n | Parcial | Productos, ventas y stock; faltan almacenes, compras y crÃ©dito |
| Reservas | Pendiente | Solo existe check-in directo |
| Dashboard y navegaciÃ³n por mÃ³dulos | Pendiente | El menÃº actual es de pantallas sueltas |
| Cambio de turno y traslados de caja | Pendiente | Cierre y reapertura, sin entrega formal |

---

## Bloque 1 â€” DocumentaciÃ³n y base

### T1.1 â€” Documentos reconciliados
**Estado:** Hecho
**Objetivo:** Dejar cinco documentos como Ãºnica fuente: SPEC, requirements,
design, design-system y tasks.

**AceptaciÃ³n:**
- [x] Los cinco documentos existen y no tienen encabezados de â€œhistÃ³ricoâ€.
- [x] No hay documentos paralelos de alcance, procesos o decisiones.
- [x] El mapa de mÃ³dulos estÃ¡ en `design.md`.

### T1.2 â€” Migraciones y seed
**Estado:** Hecho
**Objetivo:** Base local con migraciones 001â€“009 y seed idempotente.

**AceptaciÃ³n:**
- [x] `npm run migrate` corre limpio.
- [x] `npm run seed` carga habitaciones, tarifas, cuentas y productos.
- [x] El build de backend y frontend pasa.

---

## Bloque 2 â€” NÃºcleo

### T2.1 â€” AutenticaciÃ³n y roles
**Estado:** Hecho
**Requisitos:** FR-01, FR-02

**AceptaciÃ³n:**
- [x] Login con JWT de 8 horas.
- [x] Rutas de administraciÃ³n solo para ADMIN.
- [x] CRUD de usuarios y cambio de rol.

### T2.2 â€” CatÃ¡logos y contabilidad
**Estado:** Hecho
**Requisitos:** FR-03, FR-04

**AceptaciÃ³n:**
- [x] Centros y puntos de venta.
- [x] Plan de cuentas.
- [x] Asientos automÃ¡ticos de check-in, cobro, cargos, bar y caja.
- [x] Todo asiento cuadrado.

---

## Bloque 3 â€” Alojamiento

### T3.1 â€” API de reservas
**Estado:** Pendiente
**Requisitos:** FR-12, FR-27

**Pasos:**
1. Crear reserva con cliente, fechas, pax, habitaciÃ³n y tarifa.
2. Validar disponibilidad.
3. Generar cÃ³digo y folio.
4. Editar fechas, habitaciÃ³n o pax.
5. Cancelar con motivo y polÃ­tica de anticipo.

**AceptaciÃ³n:**
- [ ] `POST /reservas` crea reserva y folio.
- [ ] `PUT /reservas/:id` valida disponibilidad.
- [ ] `POST /reservas/:id/cancelar` registra motivo.
- [ ] Anticipo genera cobro y asiento.

### T3.2 â€” Pantalla de reservas
**Estado:** Pendiente
**Requisitos:** FR-38

**Pasos:**
1. Lista de reservas con estado.
2. Formulario de creaciÃ³n.
3. BÃºsqueda por cÃ³digo, cliente o documento.
4. AcciÃ³n â€œconvertir en check-inâ€.

**AceptaciÃ³n:**
- [ ] Se crea una reserva desde la pantalla.
- [ ] Se consulta y edita.
- [ ] Se convierte en check-in sin volver a capturar datos.

### T3.3 â€” Tablero de habitaciones
**Estado:** Pendiente
**Requisitos:** FR-28, FR-39

**Pasos:**
1. Vista de las 31 habitaciones por piso.
2. Estados: libre, ocupada, sucia, mantenimiento.
3. Acciones desde la habitaciÃ³n.

**AceptaciÃ³n:**
- [ ] Se ve el estado de todas las habitaciones.
- [ ] Se inicia check-in desde una habitaciÃ³n libre.
- [ ] Se marca limpieza o mantenimiento.

### T3.4 â€” Check-in, folio, cargos y check-out
**Estado:** Hecho
**Requisitos:** FR-13, FR-14, FR-15

**AceptaciÃ³n:**
- [x] Check-in walk-in con folio y cargo de alojamiento.
- [x] Cargos manuales con centro y asiento.
- [x] Check-out con cobro y cierre.
- [x] Recibo PDF.

### T3.5 â€” Desayuno y recibo
**Estado:** Hecho
**Requisitos:** FR-37

**AceptaciÃ³n:**
- [x] Desayuno incluido o pagado.
- [x] Reporte de desayunos por fecha.
- [x] PDF de recibo de caja.

### T3.6 â€” Contrato y multi-habitaciÃ³n
**Estado:** Pendiente
**Fase:** 1B

**AceptaciÃ³n:**
- [ ] Contrato bÃ¡sico de hospedaje.
- [ ] Reserva con varias habitaciones y huÃ©spedes.
- [ ] Responsable de pago por folio.

---

## Bloque 4 â€” Bar y servicios

### T4.1 â€” Productos y almacenes
**Estado:** Parcial
**Requisitos:** FR-29

**Pasos:**
1. Agregar almacÃ©n central y almacenes de subcentros.
2. Relacionar producto con almacÃ©n.
3. Pantalla de alta y ediciÃ³n de productos.

**AceptaciÃ³n:**
- [ ] Producto con centro, unidad, precio, costo y stock mÃ­nimo.
- [ ] Existen almacÃ©n central, bar terraza y restaurante.
- [ ] Se crea y edita un producto desde la pantalla.

### T4.2 â€” Compras y entrada de inventario
**Estado:** Pendiente
**Requisitos:** FR-30

**Pasos:**
1. Proveedor y compra con detalle.
2. Entrada al almacÃ©n.
3. Pago desde caja o cuenta por pagar.

**AceptaciÃ³n:**
- [ ] `POST /compras` crea compra y aumenta inventario.
- [ ] Si se paga de caja, crea movimiento y asiento.
- [ ] Si queda pendiente, crea cuenta por pagar.

### T4.3 â€” Traslado de inventario
**Estado:** Pendiente
**Requisitos:** FR-31

**AceptaciÃ³n:**
- [ ] `POST /inventario/traslados` mueve productos entre almacenes.
- [ ] Descuenta origen y aumenta destino.
- [ ] Crea dos movimientos vinculados.

### T4.4 â€” Venta de bar
**Estado:** Hecho
**Requisitos:** FR-33

**AceptaciÃ³n:**
- [x] Venta en efectivo, tarjeta, transferencia o cargo a habitaciÃ³n.
- [x] Descuenta stock.
- [x] Genera asiento de ingreso.

### T4.5 â€” CrÃ©dito de empleados
**Estado:** Pendiente
**Requisitos:** FR-34

**AceptaciÃ³n:**
- [ ] Venta a crÃ©dito con cupo.
- [ ] CxC por empleado.
- [ ] Abono y actualizaciÃ³n de saldo.

### T4.6 â€” PÃ©rdidas y cortesÃ­as
**Estado:** Pendiente
**Requisitos:** FR-36

**AceptaciÃ³n:**
- [ ] Merma o pÃ©rdida con motivo.
- [ ] CortesÃ­a autorizada con costo.
- [ ] No se registra como venta.

---

## Bloque 5 â€” Caja

### T5.1 â€” Apertura, cierre y movimientos
**Estado:** Hecho
**Requisitos:** FR-07, FR-08, FR-10, FR-11, FR-26

**AceptaciÃ³n:**
- [x] Apertura y cierre con diferencia.
- [x] Gastos, retiros, aportes y ajustes.
- [x] Asientos contables.

### T5.2 â€” Cambio de turno
**Estado:** Pendiente
**Requisitos:** FR-25

**Pasos:**
1. El saliente declara el efectivo contado.
2. El entrante confirma el conteo.
3. Se registra quiÃ©n entrega y quiÃ©n recibe.
4. Se abre el nuevo turno con el efectivo contado.

**AceptaciÃ³n:**
- [ ] Cambio de turno con conteo y responsables.
- [ ] Diferencia registrada y autorizada.
- [ ] El nuevo turno inicia con el saldo correcto.

### T5.3 â€” Traslados entre cajas
**Estado:** Pendiente
**Requisitos:** FR-09

**AceptaciÃ³n:**
- [ ] `POST /caja/traslados` crea salida y entrada vinculadas.
- [ ] El efectivo esperado de ambas cajas cambia.
- [ ] Se ve en el cuadre del turno.

### T5.4 â€” Reporte de cuadre
**Estado:** Parcial
**Requisitos:** FR-23

**AceptaciÃ³n:**
- [x] La pantalla de cierre muestra esperado, declarado y diferencia.
- [ ] Reporte PDF del cuadre por turno.

---

## Bloque 6 â€” Frontend por mÃ³dulos

### T6.1 â€” NavegaciÃ³n por mÃ³dulos
**Estado:** Pendiente
**Requisitos:** FR-35

**Pasos:**
1. Sidebar: Dashboard, Alojamiento, Bar y servicios, Caja, Reportes, ConfiguraciÃ³n.
2. Rutas anidadas por mÃ³dulo.
3. Mover check-in, huÃ©spedes y folios a Alojamiento.
4. Mover bar a Bar y servicios.

**AceptaciÃ³n:**
- [ ] El menÃº coincide con `design.md`.
- [ ] Cada mÃ³dulo agrupa sus pantallas.
- [ ] No hay pantallas sueltas en el menÃº principal.

### T6.2 â€” Dashboard
**Estado:** Pendiente
**Requisitos:** FR-35

**AceptaciÃ³n:**
- [ ] OcupaciÃ³n, llegadas, salidas, caja y ventas del dÃ­a.
- [ ] Alertas de caja cerrada, stock bajo y habitaciones sucias.

### T6.3 â€” Redirecciones y compatibilidad
**Estado:** Pendiente

**AceptaciÃ³n:**
- [ ] `/checkin`, `/folios` y `/bar` siguen funcionando o redirigen.
- [ ] No se rompen enlaces existentes.

---

## Bloque 7 â€” Reportes

### T7.1 â€” Ingresos, ocupaciÃ³n, libro y desayunos
**Estado:** Hecho
**Requisitos:** FR-19, FR-20, FR-37

**AceptaciÃ³n:**
- [x] Reportes con fecha.
- [x] Libro con debe y haber.
- [x] Desayunos por habitaciÃ³n y pax.

### T7.2 â€” Cartera y resultado por centro
**Estado:** Pendiente
**Fase:** 1B
**Requisitos:** FR-21, FR-22

### T7.3 â€” Cuadre PDF
**Estado:** Pendiente
**Requisitos:** FR-23

---

## Bloque 8 â€” Pruebas manuales y cierre

### T8.1 â€” Guion de prueba de alojamiento
**Estado:** Pendiente

**Guion:**
1. Crear reserva.
2. Hacer check-in.
3. Agregar cargo de bar al folio.
4. Hacer check-out.
5. Generar recibo.

**AceptaciÃ³n:**
- [ ] El flujo completo funciona sin cargar datos a mano.
- [ ] Los saldos y asientos cuadran.

### T8.2 â€” Guion de bar
**Estado:** Pendiente

**Guion:**
1. Crear producto.
2. Registrar compra y entrada.
3. Trasladar a subcentro.
4. Vender en efectivo.
5. Vender a crÃ©dito a empleado.
6. Revisar stock y cartera.

### T8.3 â€” Guion de caja
**Estado:** Pendiente

**Guion:**
1. Abrir caja.
2. Venta en efectivo.
3. Gasto y retiro.
4. Cambio de turno.
5. Cierre y cuadre.

---

## Orden de ejecuciÃ³n

1. **T6.1 y T6.2:** organizar el frontend por mÃ³dulos y dashboard.
2. **T3.1, T3.2 y T3.3:** reservas y tablero de habitaciones.
3. **T4.1, T4.2, T4.3, T4.5 y T4.6:** almacenes, compras, traslados y crÃ©dito.
4. **T5.2 y T5.3:** cambio de turno y traslados de caja.
5. **T7.2 y T7.3:** reportes pendientes.
6. **T8:** pruebas manuales y cierre de la fase.

Cada tarea se marca como Hecha solo cuando cumple sus criterios y queda probada
manualmente.
