# SPEC â€” Sistema Hotel New Magdalena

> **Documento vigente y fuente Ãºnica de alcance.** Los documentos de trabajo son
> `SPEC.md`, `requirements.md`, `design.md`, `design-system.md` y `tasks.md`.
> Cualquier cambio de alcance se escribe primero aquÃ­, luego en los requisitos,
> el diseÃ±o y las tareas. No se construye por fuera de estos documentos.

**VersiÃ³n:** 3.0
**Fecha:** 2026-11-18
**Estado:** Aprobado para la fase actual
**Responsable:** DueÃ±o del proyecto

---

## 1. PropÃ³sito

Reemplazar el SIMP y las planillas de Excel por un solo sistema para el Hotel
New Magdalena: alojamiento, bar recepciÃ³n, caja, contabilidad, reportes y,
mÃ¡s adelante, restaurante, eventos, compras, crÃ©dito de empresas y facturaciÃ³n.

El sistema debe funcionar **local-first**: el servidor vive en recepciÃ³n y el
hotel no depende de internet para operar. La base es PostgreSQL embebido
(PGlite en la v1) y el mismo SQL debe poder correr en PostgreSQL real.

## 2. Principios

1. Un solo sistema y una sola captura de datos.
2. Todo movimiento de dinero queda en caja y en el libro de doble partida.
3. Todo cargo tiene centro de costo.
4. El check-in completo debe tomar menos de 3 minutos.
5. No se construye un mÃ³dulo sin base de datos, API y criterios de aceptaciÃ³n.
6. No se agrega alcance nuevo sin actualizar este documento.

## 3. Mapa de mÃ³dulos

| MÃ³dulo | QuÃ© incluye | Fase actual |
|---|---|---|
| Dashboard | OcupaciÃ³n, llegadas, salidas, caja, ventas y alertas del dÃ­a | SÃ­ |
| Alojamiento | Reservas, disponibilidad, tablero, check-in, huÃ©spedes, folios, cargos, check-out, desayuno | SÃ­ |
| Bar y servicios | Productos, compras, almacenes, inventario, traslados, ventas, crÃ©dito de empleados | SÃ­ (bar recepciÃ³n) |
| Caja | Turno, movimientos, cambio de turno, traslados, cierre y arqueo | SÃ­ |
| Reportes | Ingresos, ocupaciÃ³n, libro, desayunos, cartera, resultado y cuadre | Parcial |
| ConfiguraciÃ³n | Usuarios, roles, tarifas, temporadas, centros y parÃ¡metros | Parcial |
| Restaurante y terraza | POS, mesas, comandas, pagos divididos | Fase 1C |
| Eventos, paquetes y tours | Espacios, anticipos, paquetes, tour Represa | Fase 2 |
| FacturaciÃ³n electrÃ³nica y web | DIAN, reservas online, WhatsApp | Fase 3 |

## 4. Fase actual: operaciÃ³n base

La fase actual cierra **Alojamiento, Bar recepciÃ³n y Caja** para pruebas
manuales. El bar y la caja avanzada se mueven aquÃ­: antes estaban en Fase 1C,
pero son parte de la operaciÃ³n diaria que se va a probar ahora.

### 4.1 Alojamiento

- Crear, editar y cancelar reservas con fechas, pax, habitaciÃ³n, tarifa y abono.
- Consultar disponibilidad y ocupaciÃ³n.
- Tablero de habitaciones: libre, ocupada, sucia, mantenimiento.
- Check-in walk-in y check-in de reserva.
- Folio con cargos de alojamiento, desayuno, bar y cargos manuales.
- Check-out con cobro en efectivo, tarjeta, transferencia o crÃ©dito.
- Recibo PDF y reporte de desayunos.

### 4.2 Bar recepciÃ³n

- CatÃ¡logo de productos con precio, costo, stock mÃ­nimo y centro.
- Compra y entrada de inventario a almacÃ©n.
- AlmacÃ©n central y almacenes de subcentros (bar terraza, restaurante).
- Traslado de inventario entre almacenes.
- Venta en efectivo, tarjeta, transferencia o cargo a la habitaciÃ³n.
- CrÃ©dito a empleados con cupo y abonos.
- PÃ©rdidas, mermas y cortesÃ­as autorizadas.

### 4.3 Caja

- Apertura y cierre por turno, con responsable.
- Ventas en efectivo, gastos, retiros del dueÃ±o, aportes y ajustes.
- Cambio de turno con conteo y entrega.
- Traslados de efectivo entre cajas y desde bar terraza/restaurante.
- Cuadre con efectivo esperado, declarado y diferencia.

### 4.4 Frontend

- NavegaciÃ³n por mÃ³dulos, no por pantallas sueltas:
  **Dashboard â†’ Alojamiento â†’ Bar y servicios â†’ Caja â†’ Reportes â†’ ConfiguraciÃ³n**.
- Cada mÃ³dulo agrupa sus pantallas y acciones.
- El diseÃ±o visual se rige por `design-system.md`.
- El mapa de pantallas y rutas estÃ¡ en `design.md`.

## 5. Reglas de negocio

### 5.1 Habitaciones

- 33 espacios: 31 rentables, 103 bodega y la oficina de administraciÃ³n.
- 23 con aire acondicionado y 8 con ventilador: 108, 205, 207, 209, 301, 303, 305 y 405.
- La 105 es suite: capacidad 6, acomodaciones 2/5/6. La suite para 2 se cobra como 6 pax.
- 106 es quÃ­ntuple: acomodaciones 4/5. 201: 4/5. 109, 208 y 403: 3/4/5.
- Triples: 1/2/3. Dobles: 1/2. La 205 solo admite 1.
- El inventario detallado estÃ¡ en `seeds/habitaciones.csv`.

### 5.2 Tarifas

- Se cobra por **pax**, no por habitaciÃ³n.
- Temporada baja, normal: 1â€“6 pax = 90.000 / 130.000 / 170.000 / 210.000 / 250.000 / 290.000.
- Temporada baja, escenarios A/B: 75.000 / 110.000 / 145.000 / 180.000 / 210.000 / 250.000.
- Temporada baja, escenario C: 80.000 / 115.000 / 155.000 / 190.000 / 225.000 / 260.000.
- Temporada alta, normal: 130.000 / 180.000 / 240.000 / 300.000 / 360.000 / 400.000.
- Temporada alta, A/B: 110.000 / 155.000 / 205.000 / 255.000 / 305.000 / 345.000.
- Temporada alta, C: 115.000 / 160.000 / 215.000 / 270.000 / 325.000 / 360.000.
- Ventilador: 50.000 baja y 80.000 alta; sin descuento.
- Escenario A: llegada despuÃ©s de 7:30 p.m., 15% en todas las noches.
- Escenario B: dos o mÃ¡s noches, 15% en todas las noches.
- Escenario C: grupo o varias habitaciones, 10%; si no cierra, se aplica B (15%).
- Los escenarios no se suman. No se ofrece descuento de entrada.
- Solo aplican con ocupaciÃ³n de 15 habitaciones o menos.
- La decisiÃ³n de temporada se toma a las 3 p.m. Si al llegar a 15 habitaciones
  se cambia a alta, esa venta queda en baja y las siguientes en alta.
- Fines de semana, festivos y del 15 de diciembre al 15 de enero: alta por defecto.
- La matriz completa estÃ¡ en `seeds/tarifas.csv`.

### 5.3 Desayuno

- 15.000 por persona por noche.
- Las tarifas pÃºblicas no incluyen desayuno; se agrega si se pide.
- La tarifa de empresa puede incluirlo sin cobrarlo aparte.
- Se cobra `pax Ã— noches`.
- Si estÃ¡ incluido, no se devuelve. Si estÃ¡ pagado, solo el administrador puede anularlo.
- El tratamiento de impuestos queda pendiente del contador.

### 5.4 Impuestos

- Alojamiento: la base no incluye IVA; se agrega 19% solo si el huÃ©sped pide factura.
- Restaurante y bar: impoconsumo 8% incluido en el precio.
- Desayuno: tratamiento pendiente de confirmar con el contador.
- No se inventan tarifas ni impuestos: se usan los valores aprobados.

### 5.5 Caja

- Caja central: alojamiento + bar recepciÃ³n.
- Bar terraza y restaurante entregan su efectivo a la caja central al final del turno.
- Tarjeta y transferencia no entran a la caja fÃ­sica.
- OperaciÃ³n 24 horas con 2 o 3 turnos. El entrante cuenta y el saliente responde.
- Faltante o sobrante se investiga; si no se explica, se registra y se autoriza.
- Gastos: los autoriza el dueÃ±o; se pide factura o soporte; la nÃ³mina sale de caja.
- Retiros del dueÃ±o: se registran en cuenta socio, no como gasto.
- Aportes del dueÃ±o: entran a caja y se registran como aporte.
- El efectivo inicial es el conteo real al momento del cambio de sistema; no se
  migra la caja acumulada del SIMP.

### 5.6 Contabilidad

- Todo movimiento de dinero se registra con doble partida (debe = haber).
- Los cargos generan cuentas por cobrar; los cobros las cancelan.
- El efectivo y los bancos son cuentas de balance; los ingresos van por centro.
- No se registra un ingreso sin cargo, ni un cobro sin contrapartida.
- El plan de cuentas y los asientos estÃ¡n en `backend/migrations` y `design.md`.

### 5.7 Bar e inventario

- Se compra cuando el stock baja a 2 o 3 unidades.
- Producto daÃ±ado o vencido se registra como pÃ©rdida o merma.
- Los empleados consumen con crÃ©dito y cupo; pagan o abonan.
- Las cortesÃ­as las autoriza el dueÃ±o o el administrador.
- Hay almacÃ©n central y almacenes de subcentros; el traslado mueve inventario,
  no dinero.
- La venta descuenta stock del almacÃ©n correspondiente.

### 5.8 Clientes y crÃ©dito

- Tipos: PARTICULAR, EMPRESA, EMPLEADO, GRUPO_TRABAJO, SOCIO.
- Empresas: cupo y dÃ­as de crÃ©dito segÃºn acuerdo (8, 15 o 30 dÃ­as).
- Empleados y grupos: cupo con tope y abonos.
- Una venta a crÃ©dito no puede superar el cupo.
- El consolidado por empresa se envÃ­a por el total; el detalle queda por trabajador.

## 6. Datos y migraciÃ³n

- Maestros a migrar: habitaciones, tarifas vigentes, clientes, empresas, usuarios y
  saldos abiertos.
- No se migran: tarifas basura, caja acumulada, adjuntos BLOB ni histÃ³rico completo.
- El SIMP tiene 42 tablas, 523 reservas, 609 pagos, 392 clientes, 51 empresas,
  32 habitaciones, 982 tarifas (943 â€œPersonalizadaâ€), 149 dÃ­as de caja y 151 minutas.
- El histÃ³rico se conserva como referencia, no como blueprint.
- Los datos de prueba se cargan con `seeds/habitaciones.csv` y `seeds/tarifas.csv`.

## 7. Arquitectura

- **Backend:** Node.js 22, TypeScript, Express 5, JWT, bcrypt, zod.
- **Base de datos:** PGlite embebido en `backend/.data` para la v1; SQL compatible
  con PostgreSQL. No hay Docker ni Supabase en la operaciÃ³n local.
- **Frontend:** React, Vite, React Router, Tailwind, diseÃ±o navy/oro/crema.
- **Reportes:** consultas SQL y PDF con `pdfkit`.
- **Roles:** ADMIN, GERENTE, RECEPCION, CAJERO.
- **OperaciÃ³n:** servidor local en recepciÃ³n; respaldo diario pendiente.

## 8. Criterios de aceptaciÃ³n de la fase actual

La fase se considera lista para pruebas manuales cuando:

- [ ] Un recepcionista crea una reserva, hace check-in, agrega cargos, hace
      check-out y genera el recibo.
- [ ] El tablero muestra las habitaciones libres, ocupadas y sucias.
- [ ] Una venta de bar en efectivo descuenta stock y cuadra la caja.
- [ ] Una venta de bar se carga a la habitaciÃ³n y aparece en el folio.
- [ ] Una compra entra al almacÃ©n y se puede trasladar a un subcentro.
- [ ] Un empleado consume a crÃ©dito y queda su saldo.
- [ ] Se abre caja, se registran gastos, retiro y aporte, y se hace cambio de turno.
- [ ] El cierre calcula el efectivo esperado y registra la diferencia.
- [ ] Todos los movimientos de dinero tienen asiento contable cuadrado.
- [ ] El menÃº funciona por mÃ³dulos: Dashboard, Alojamiento, Bar, Caja, Reportes,
      ConfiguraciÃ³n.

## 9. Fases siguientes

| Fase | Contenido |
|---|---|
| 1B | Empresas y crÃ©dito, mensualidad, contratos, extensiones, cambios de habitaciÃ³n, descuentos condicionales, CxC |
| 1C | POS restaurante/terraza, inventario completo, compras y proveedores, piscina, lavanderÃ­a, activos fijos |
| 2 | Eventos, paquetes, tour Represa, WhatsApp |
| 3 | FacturaciÃ³n electrÃ³nica DIAN, reservas online, web pÃºblica |

## 10. Decisiones registradas

1. **Local-first:** servidor en recepciÃ³n, sin dependencia de internet.
2. **PGlite en v1:** PostgreSQL embebido; SQL portable a PostgreSQL real.
3. **Precio por pax**, no por habitaciÃ³n; suite se cobra como 6 pax.
4. **Descuentos por escenario A/B/C**, sin suma y solo con ocupaciÃ³n â‰¤ 15.
5. **Temporada se decide a las 3 p.m.**; alta por defecto en festivos y diciembre.
6. **Desayuno 15.000 por persona/noche**; no incluido en tarifa pÃºblica.
7. **Caja central Ãºnica** para alojamiento y bar recepciÃ³n; traslados desde terraza/restaurante.
8. **Contabilidad de doble partida** para todo movimiento de dinero.
9. **Bar y caja avanzada se mueven a la fase actual** para pruebas manuales.
10. **No se migra la caja acumulada del SIMP.**

## 11. Gobernanza

- Los cinco documentos de trabajo son la Ãºnica fuente.
- Un cambio de alcance se propone, se aprueba, se escribe en este SPEC, se
  actualiza `requirements.md`, `design.md`, `tasks.md` y reciÃ©n despuÃ©s se implementa.
- Una tarea sin requisito y criterio de aceptaciÃ³n no se ejecuta.
- No se crean documentos paralelos de alcance, procesos o decisiones.
