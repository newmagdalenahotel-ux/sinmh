# SPEC — Sistema Hotel New Magdalena

> **Documento vigente y fuente única de alcance.** Los documentos de trabajo son
> `SPEC.md`, `requirements.md`, `design.md`, `design-system.md` y `tasks.md`.
> Cualquier cambio de alcance se escribe primero aquí, luego en los requisitos,
> el diseño y las tareas. No se construye por fuera de estos documentos.

**Versión:** 3.0
**Fecha:** 2026-11-18
**Estado:** Aprobado para la fase actual
**Responsable:** Dueño del proyecto

---

## 1. Propósito

Reemplazar el SIMP y las planillas de Excel por un solo sistema para el Hotel
New Magdalena: alojamiento, bar recepción, caja, contabilidad, reportes y,
más adelante, restaurante, eventos, compras, crédito de empresas y facturación.

El sistema debe funcionar **local-first**: el servidor vive en recepción y el
hotel no depende de internet para operar. La base es PostgreSQL embebido
(PGlite en la v1) y el mismo SQL debe poder correr en PostgreSQL real.

## 2. Principios

1. Un solo sistema y una sola captura de datos.
2. Todo movimiento de dinero queda en caja y en el libro de doble partida.
3. Todo cargo tiene centro de costo.
4. El check-in completo debe tomar menos de 3 minutos.
5. No se construye un módulo sin base de datos, API y criterios de aceptación.
6. No se agrega alcance nuevo sin actualizar este documento.

## 3. Mapa de módulos

| Módulo | Qué incluye | Fase actual |
|---|---|---|
| Dashboard | Ocupación, llegadas, salidas, caja, ventas y alertas del día | Sí |
| Alojamiento | Reservas, disponibilidad, tablero, check-in, huéspedes, folios, cargos, check-out, desayuno | Sí |
| Bar y servicios | Productos, compras, almacenes, inventario, traslados, ventas, crédito de empleados | Sí (bar recepción) |
| Caja | Turno, movimientos, cambio de turno, traslados, cierre y arqueo | Sí |
| Reportes | Ingresos, ocupación, libro, desayunos, cartera, resultado y cuadre | Parcial |
| Configuración | Usuarios, roles, tarifas, temporadas, centros y parámetros | Parcial |
| Restaurante y terraza | POS, mesas, comandas, pagos divididos | Fase 1C |
| Eventos, paquetes y tours | Espacios, anticipos, paquetes, tour Represa | Fase 2 |
| Facturación electrónica y web | DIAN, reservas online, WhatsApp | Fase 3 |

## 4. Fase actual: operación base

La fase actual cierra **Alojamiento, Bar recepción y Caja** para pruebas
manuales. El bar y la caja avanzada se mueven aquí: antes estaban en Fase 1C,
pero son parte de la operación diaria que se va a probar ahora.

### 4.1 Alojamiento

- Crear, editar y cancelar reservas con fechas, pax, habitación, tarifa y abono.
- Consultar disponibilidad y ocupación.
- Tablero de habitaciones: libre, ocupada, sucia, mantenimiento.
- Check-in walk-in y check-in de reserva.
- Folio con cargos de alojamiento, desayuno, bar y cargos manuales.
- Check-out con cobro en efectivo, tarjeta, transferencia o crédito.
- Recibo PDF y reporte de desayunos.

### 4.2 Bar recepción

- Catálogo de productos con precio, costo, stock mínimo y centro.
- Compra y entrada de inventario a almacén.
- Almacén central y almacenes de subcentros (bar terraza, restaurante).
- Traslado de inventario entre almacenes.
- Venta en efectivo, tarjeta, transferencia o cargo a la habitación.
- Crédito a empleados con cupo y abonos.
- Pérdidas, mermas y cortesías autorizadas.

### 4.3 Caja

- Apertura y cierre por turno, con responsable.
- Ventas en efectivo, gastos, retiros del dueño, aportes y ajustes.
- Cambio de turno con conteo y entrega.
- Traslados de efectivo entre cajas y desde bar terraza/restaurante.
- Cuadre con efectivo esperado, declarado y diferencia.

### 4.4 Frontend

- Navegación por módulos, no por pantallas sueltas:
  **Dashboard → Alojamiento → Bar y servicios → Caja → Reportes → Configuración**.
- Cada módulo agrupa sus pantallas y acciones.
- El diseño visual se rige por `design-system.md`.
- El mapa de pantallas y rutas está en `design.md`.

## 5. Reglas de negocio

### 5.1 Habitaciones

- 33 espacios: 31 rentables, 103 bodega y la oficina de administración.
- 23 con aire acondicionado y 8 con ventilador: 108, 205, 207, 209, 301, 303, 305 y 405.
- La 105 es suite: capacidad 6, acomodaciones 2/5/6. La suite para 2 se cobra como 6 pax.
- 106 es quíntuple: acomodaciones 4/5. 201: 4/5. 109, 208 y 403: 3/4/5.
- Triples: 1/2/3. Dobles: 1/2. La 205 solo admite 1.
- El inventario detallado está en `seeds/habitaciones.csv`.

### 5.2 Tarifas

- Se cobra por **pax**, no por habitación.
- Temporada baja, normal: 1–6 pax = 90.000 / 130.000 / 170.000 / 210.000 / 250.000 / 290.000.
- Temporada baja, escenarios A/B: 75.000 / 110.000 / 145.000 / 180.000 / 210.000 / 250.000.
- Temporada baja, escenario C: 80.000 / 115.000 / 155.000 / 190.000 / 225.000 / 260.000.
- Temporada alta, normal: 130.000 / 180.000 / 240.000 / 300.000 / 360.000 / 400.000.
- Temporada alta, A/B: 110.000 / 155.000 / 205.000 / 255.000 / 305.000 / 345.000.
- Temporada alta, C: 115.000 / 160.000 / 215.000 / 270.000 / 325.000 / 360.000.
- Ventilador: 50.000 baja y 80.000 alta; sin descuento.
- Escenario A: llegada después de 7:30 p.m., 15% en todas las noches.
- Escenario B: dos o más noches, 15% en todas las noches.
- Escenario C: grupo o varias habitaciones, 10%; si no cierra, se aplica B (15%).
- Los escenarios no se suman. No se ofrece descuento de entrada.
- Solo aplican con ocupación de 15 habitaciones o menos.
- La decisión de temporada se toma a las 3 p.m. Si al llegar a 15 habitaciones
  se cambia a alta, esa venta queda en baja y las siguientes en alta.
- Fines de semana, festivos y del 15 de diciembre al 15 de enero: alta por defecto.
- La matriz completa está en `seeds/tarifas.csv`.

### 5.3 Desayuno

- 15.000 por persona por noche.
- Las tarifas públicas no incluyen desayuno; se agrega si se pide.
- La tarifa de empresa puede incluirlo sin cobrarlo aparte.
- Se cobra `pax × noches`.
- Si está incluido, no se devuelve. Si está pagado, solo el administrador puede anularlo.
- El tratamiento de impuestos queda pendiente del contador.

### 5.4 Impuestos

- Alojamiento: la base no incluye IVA; se agrega 19% solo si el huésped pide factura.
- Restaurante y bar: impoconsumo 8% incluido en el precio.
- Desayuno: tratamiento pendiente de confirmar con el contador.
- No se inventan tarifas ni impuestos: se usan los valores aprobados.

### 5.5 Caja

- Caja central: alojamiento + bar recepción.
- Bar terraza y restaurante entregan su efectivo a la caja central al final del turno.
- Tarjeta y transferencia no entran a la caja física.
- Operación 24 horas con 2 o 3 turnos. El entrante cuenta y el saliente responde.
- Faltante o sobrante se investiga; si no se explica, se registra y se autoriza.
- Gastos: los autoriza el dueño; se pide factura o soporte; la nómina sale de caja.
- Retiros del dueño: se registran en cuenta socio, no como gasto.
- Aportes del dueño: entran a caja y se registran como aporte.
- El efectivo inicial es el conteo real al momento del cambio de sistema; no se
  migra la caja acumulada del SIMP.

### 5.6 Contabilidad

- Todo movimiento de dinero se registra con doble partida (debe = haber).
- Los cargos generan cuentas por cobrar; los cobros las cancelan.
- El efectivo y los bancos son cuentas de balance; los ingresos van por centro.
- No se registra un ingreso sin cargo, ni un cobro sin contrapartida.
- El plan de cuentas y los asientos están en `backend/migrations` y `design.md`.

### 5.7 Bar e inventario

- Se compra cuando el stock baja a 2 o 3 unidades.
- Producto dañado o vencido se registra como pérdida o merma.
- Los empleados consumen con crédito y cupo; pagan o abonan.
- Las cortesías las autoriza el dueño o el administrador.
- Hay almacén central y almacenes de subcentros; el traslado mueve inventario,
  no dinero.
- La venta descuenta stock del almacén correspondiente.

### 5.8 Clientes y crédito

- Tipos: PARTICULAR, EMPRESA, EMPLEADO, GRUPO_TRABAJO, SOCIO.
- Empresas: cupo y días de crédito según acuerdo (8, 15 o 30 días).
- Empleados y grupos: cupo con tope y abonos.
- Una venta a crédito no puede superar el cupo.
- El consolidado por empresa se envía por el total; el detalle queda por trabajador.

## 6. Datos y migración

- Maestros a migrar: habitaciones, tarifas vigentes, clientes, empresas, usuarios y
  saldos abiertos.
- No se migran: tarifas basura, caja acumulada, adjuntos BLOB ni histórico completo.
- El SIMP tiene 42 tablas, 523 reservas, 609 pagos, 392 clientes, 51 empresas,
  32 habitaciones, 982 tarifas (943 “Personalizada”), 149 días de caja y 151 minutas.
- El histórico se conserva como referencia, no como blueprint.
- Los datos de prueba se cargan con `seeds/habitaciones.csv` y `seeds/tarifas.csv`.

## 7. Arquitectura

- **Backend:** Node.js 22, TypeScript, Express 5, JWT, bcrypt, zod.
- **Base de datos:** PGlite embebido en `backend/.data` para la v1; SQL compatible
  con PostgreSQL. No hay Docker ni Supabase en la operación local.
- **Frontend:** React, Vite, React Router, Tailwind, diseño navy/oro/crema.
- **Reportes:** consultas SQL y PDF con `pdfkit`.
- **Roles:** ADMIN, GERENTE, RECEPCION, CAJERO.
- **Operación:** servidor local en recepción; respaldo diario pendiente.

## 8. Criterios de aceptación de la fase actual

La fase se considera lista para pruebas manuales cuando:

- [ ] Un recepcionista crea una reserva, hace check-in, agrega cargos, hace
      check-out y genera el recibo.
- [ ] El tablero muestra las habitaciones libres, ocupadas y sucias.
- [ ] Una venta de bar en efectivo descuenta stock y cuadra la caja.
- [ ] Una venta de bar se carga a la habitación y aparece en el folio.
- [ ] Una compra entra al almacén y se puede trasladar a un subcentro.
- [ ] Un empleado consume a crédito y queda su saldo.
- [ ] Se abre caja, se registran gastos, retiro y aporte, y se hace cambio de turno.
- [ ] El cierre calcula el efectivo esperado y registra la diferencia.
- [ ] Todos los movimientos de dinero tienen asiento contable cuadrado.
- [ ] El menú funciona por módulos: Dashboard, Alojamiento, Bar, Caja, Reportes,
      Configuración.

## 9. Fases siguientes

| Fase | Contenido |
|---|---|
| 1B | Empresas y crédito, mensualidad, contratos, extensiones, cambios de habitación, descuentos condicionales, CxC |
| 1C | POS restaurante/terraza, inventario completo, compras y proveedores, piscina, lavandería, activos fijos |
| 2 | Eventos, paquetes, tour Represa, WhatsApp |
| 3 | Facturación electrónica DIAN, reservas online, web pública |

## 10. Decisiones registradas

1. **Local-first:** servidor en recepción, sin dependencia de internet.
2. **PGlite en v1:** PostgreSQL embebido; SQL portable a PostgreSQL real.
3. **Precio por pax**, no por habitación; suite se cobra como 6 pax.
4. **Descuentos por escenario A/B/C**, sin suma y solo con ocupación ≤ 15.
5. **Temporada se decide a las 3 p.m.**; alta por defecto en festivos y diciembre.
6. **Desayuno 15.000 por persona/noche**; no incluido en tarifa pública.
7. **Caja central única** para alojamiento y bar recepción; traslados desde terraza/restaurante.
8. **Contabilidad de doble partida** para todo movimiento de dinero.
9. **Bar y caja avanzada se mueven a la fase actual** para pruebas manuales.
10. **No se migra la caja acumulada del SIMP.**

## 11. Gobernanza

- Los cinco documentos de trabajo son la única fuente.
- Un cambio de alcance se propone, se aprueba, se escribe en este SPEC, se
  actualiza `requirements.md`, `design.md`, `tasks.md` y recién después se implementa.
- Una tarea sin requisito y criterio de aceptación no se ejecuta.
- No se crean documentos paralelos de alcance, procesos o decisiones.
