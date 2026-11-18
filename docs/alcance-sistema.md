# Alcance del sistema — Hotel New Magdalena

**Estado:** documento de alcance vigente.
**Autoridad:** mientras se reescribe el SPEC, este documento manda sobre `SPEC.md`, `requirements.md`, `design.md` y `tasks.md`. Esos cuatro quedan como históricos.
**Base:** SPEC, `design.md`, `design-system.md`, procesos reales del hotel y las decisiones registradas en `decisiones.md`.

---

## 1. Qué es el sistema

Un solo sistema para reemplazar el SIMP y las planillas de Excel, cubriendo toda la operación del complejo:

- Alojamiento.
- Caja y turnos.
- Clientes, empresas y crédito.
- Bar recepción, bar terraza y restaurante.
- Eventos, piscina/pasadías, paquetes y tours.
- Gimnasio y lavandería.
- Compras, proveedores y gastos.
- Reportes.
- Facturación electrónica.

**Operación:** local-first. Un servidor en recepción con PostgreSQL, respaldo a la nube y acceso remoto opcional. El mismo código puede correr en la nube si se decide.

---

## 2. Principios de alcance

1. **Una sola digitación.** Nada se vuelve a escribir en Excel.
2. **Todo movimiento de dinero** debe quedar en caja y, cuando esté el módulo contable, en el libro de doble partida.
3. **Todo cargo** lleva centro de costo o ingreso.
4. **La tarifa es por pax**, no por habitación, salvo la suite 105, que se cobra como 6 personas.
5. **La caja es central** y recibe los traslados de los bares y el restaurante.
6. **No se agrega funcionalidad** sin actualizar este documento y registrar la decisión.
7. **Cada franja** tiene alcance, criterios de aceptación y demo antes de pasar a la siguiente.
8. **No se construye UI** de un módulo antes de su base de datos y su API.

---

## 3. Mapa completo de módulos

| Módulo | Qué incluye | Fase original | Estado |
|---|---|---|---|
| Núcleo | Login, JWT, roles, usuarios, centros, configuración, auditoría | 1A | Parcial (auth y usuarios/roles) |
| Alojamiento | Habitaciones, tarifas, disponibilidad, reservas, check-in, folios, check-out, cargos, desayuno | 1A | Parcial (check-in/out y cargos manuales) |
| Alojamiento avanzado | Mensualidad, por horas, extensiones, cambios de habitación, contrato | 1A/1B | Pendiente |
| Caja | Apertura, cierre, arqueo, ventas en efectivo | 1A | Hecho |
| Caja avanzada | Gastos, retiros del dueño, aportes, traslados, ajustes | 1A | Parcial (faltan traslados) |
| Contabilidad | Cuentas, libro de doble partida, asientos, cuenta socio | 1A | Parcial |
| Clientes y crédito | Particulares, empresas, empleados, grupos, cupos, CxC, abonos, consolidados | 1A/1B | Pendiente |
| Bar recepción | Productos, ventas, créditos de empleados, stock | 1A/1C | Parcial (ventas y stock) |
| Bar terraza y restaurante | Mesas, comandas, pagos divididos, propinas | 1C | Pendiente |
| Eventos | Uso del espacio, anticipo 10/50 %, devolución 24 h | 2 | Pendiente |
| Piscina y pasadías | Entradas, horarios, grupos | 1C | Pendiente |
| Paquetes y tours | Represa de Prado, habitación + almuerzo + piscina | 2 | Pendiente |
| Gimnasio y lavandería | Servicios y ventas | 1C | Pendiente |
| Compras y proveedores | Compras, gastos, cuentas por pagar | 1C | Pendiente |
| Reportes | Ingresos, ocupación, cartera, resultado por centro, cuadre, cortesías, desayunos | 1A/1B | Parcial (ingresos, ocupación, libro y desayunos) |
| Facturación electrónica | DIAN, resolución, XML, PDF | 3 | Pendiente |
| WhatsApp y web | Mensajes, reservas online | 2/3 | Pendiente |
| Impresión | PDF para láser (v1), tirilla térmica (después) | 1A | Parcial (PDF hecho; térmica después) |
| Operación | Backups, restauración, monitoreo, auditoría | 1A | Pendiente |

---

## 4. Fases y orden

### Fase 0 — Base técnica
Repositorio, PostgreSQL embebido, migraciones, login, shell, diseño.
**Estado:** hecha.

### Franja 1 — Recepción operativa
Lo que ya está construido:

- Login con JWT y roles base.
- 33 habitaciones, 31 rentables, 50 tarifas.
- Disponibilidad por fechas y pax.
- Cotización por pax, clima, temporada y escenario.
- Check-in con cliente, huésped, folio, cargos de alojamiento y desayuno.
- Cobro en efectivo, tarjeta o transferencia.
- Caja: apertura, movimientos, cierre y arqueo.
- Folios abiertos y check-out con cobro del saldo.

**Estado:** cerrada operativamente. Le faltan los complementos de la v1 (sección 5).

### Fase 1A — Núcleo financiero y alojamiento
La Fase 1A original incluye además:

- Contabilidad de doble partida.
- Plan de cuentas.
- Cuenta socio.
- Reportes.
- Usuarios y permisos.
- Bar recepción.
- Cargos manuales.
- PDF de recibo y reportes.

**Estado:** parcial. La operación diaria funciona; la parte contable y de reportes no.

### Fase 1B — Reglas del alojamiento
- Contratos de mensualidad.
- Descuentos condicionales.
- Extensiones y cambios de habitación.
- Empresas, cupos y cuentas por cobrar.
- Consolidado por empresa.

### Fase 1C — Operación ampliada
- POS de bares y restaurante.
- Inventario y compras.
- Piscina y pasadías.
- Averías, limpieza y turnos.
- Activos fijos.

### Fase 2 — Eventos, paquetes y WhatsApp
- Eventos completos.
- Paquetes y tours.
- WhatsApp Cloud API.

### Fase 3 — Facturación y web
- Facturación electrónica DIAN.
- Reservas online.
- Web pública.

---

## 5. Qué falta para cerrar la v1

| Pendiente | Por qué importa |
|---|---|
| **Contabilidad de doble partida** | Base hecha: cuentas, asientos automáticos y libro. Falta cuenta socio y cierre contable. |
| **Plan de cuentas y cuenta socio** | El plan está cargado; falta la cuenta socio y sus movimientos. |
| **Reportes mínimos** | Ingresos, ocupación, libro y desayunos hechos; faltan cartera, resultado por centro y cuadre. |
| **Bar recepción** | Ventas, stock y cargo a habitación hechos; faltan créditos de empleados y compras. |
| **Caja avanzada** | Gastos, retiros del dueño, aportes y ajustes hechos; faltan traslados entre cajas. |
| **Temporada y precios editables** | Hoy la matriz está en la semilla; falta pantalla. |
| **Respaldos** | Copia diaria y restauración probada. |
| **Pruebas y CI** | No hay suite automatizada ni integración continua. |

---

## 6. Fuera de la v1

Queda explícitamente fuera de la primera versión:

- POS de bar terraza y restaurante.
- Inventario de productos.
- Eventos, piscina/pasadías y tours.
- Gimnasio y lavandería como venta.
- Compras y proveedores.
- Cuentas por cobrar de empresas y empleados.
- Facturación electrónica DIAN.
- WhatsApp y reservas online.
- Nómina y propinas.
- Modo oscuro.

No se implementan hasta que su fase esté aprobada.

---

## 7. Reglas para no volver a dispersar el alcance

1. **Este documento es la línea base.** Si algo no está aquí, no se construye.
2. Un cambio de alcance sigue este orden: propuesta → decisión en `decisiones.md` → actualización de este documento → tarea.
3. Cada franja se define con: objetivo, alcance, criterios de aceptación, demo y fecha.
4. Un módulo no se considera terminado sin su caja, su contabilidad y su reporte asociado.
5. No se mezclan fases: primero se cierra la v1, luego 1B, luego 1C.
6. Los documentos históricos no se editan para agregar funcionalidad; solo se marcan como históricos y se reescriben al cerrar la v1.

---

## 8. Documentos y autoridad

**Vigentes:**

- `alcance-sistema.md` — este documento.
- `decisiones.md` — decisiones de arquitectura y alcance.
- `procesos-operativos.md` — cómo opera el hotel.
- `tarifas.md` — precios, escenarios, temporada y desayuno.
- `inventario-habitaciones.md` — habitaciones y capacidades.
- `impuestos.md` — IVA e impoconsumo.
- `datos-existentes.md` — SIMP y planillas, migración.
- `design-system.md` — identidad visual.

**Históricos (se reescribirán al cerrar la v1):**

- `SPEC.md`
- `requirements.md`
- `design.md`
- `tasks.md`

---

## 9. Próximo paso propuesto

1. Alcance aprobado.
2. **Franja 2 — contabilidad y reportes base:** hecha (cuentas, libro, asientos automáticos, ingresos, ocupación y libro).
3. **Franja 3 — usuarios/roles, cargos manuales, desayunos del día y PDF de recibo.** Hecha.
4. **Franja 4 — bar recepción y caja avanzada.** Bar recepción hecho; caja avanzada con gastos, retiros, aportes y ajustes; faltan traslados entre cajas.
5. Pasar a 1B: empresas, crédito, mensualidad, extensiones y cambios.
6. Pasar a 1C: POS, inventario, piscina y compras.
7. Seguir con 2 y 3.

Cada paso se ejecuta como franja con su propia lista de tareas y criterios de aceptación.
