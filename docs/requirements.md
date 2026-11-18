# Requirements — Fase 1A

**Versión:** 1.0  
**Fecha:** 2026-11-13  
**Basado en:** SPEC.md v1.0

Cada requisito funcional (FR) tiene:
- Descripción clara
- Criterio de aceptación medible
- Prioridad (Alta = bloqueante, Media = importante, Baja = deseable)

---

## Módulo: Autenticación y Seguridad

### FR-01 — Login de usuario
**Prioridad:** Alta  
**Descripción:** Un usuario puede autenticarse con username y password. El sistema retorna un JWT con el rol del usuario.

**Criterio de aceptación:**
- POST `/auth/login` con credenciales válidas → 200 + JWT.
- POST `/auth/login` con credenciales inválidas → 401.
- El JWT contiene `usuario_id`, `rol` y expira en 8 horas.

### FR-02 — Autorización por rol
**Prioridad:** Alta  
**Descripción:** Los endpoints están protegidos por rol. Un CAJERO no puede acceder a endpoints de ADMIN.

**Criterio de aceptación:**
- GET `/admin/usuarios` con JWT de CAJERO → 403.
- GET `/admin/usuarios` con JWT de ADMIN → 200.

---

## Módulo: Centros y Configuración

### FR-03 — Listado de centros
**Prioridad:** Alta  
**Descripción:** El sistema puede listar todos los centros activos.

**Criterio de aceptación:**
- GET `/centros` → lista con al menos los 8 centros iniciales.
- Cada centro tiene `codigo`, `nombre`, `tipo`.

### FR-04 — Listado de puntos de venta
**Prioridad:** Alta  
**Descripción:** El sistema puede listar los POS activos con sus capacidades.

**Criterio de aceptación:**
- GET `/puntos-venta` → lista con `codigo`, `nombre`, `centro_id`, `capacidades`.

---

## Módulo: Clientes

### FR-05 — CRUD de clientes
**Prioridad:** Alta  
**Descripción:** Se puede crear, leer, actualizar y buscar clientes de tipo PARTICULAR, EMPRESA, EMPLEADO, GRUPO_TRABAJO, SOCIO.

**Criterio de aceptación:**
- POST `/clientes` con datos válidos → 201 + cliente creado.
- GET `/clientes?documento=12345678` → encuentra cliente por documento.
- PUT `/clientes/:id` actualiza datos.
- DELETE `/clientes/:id` marca `activo=false` (soft delete).

### FR-06 — Cupo de crédito
**Prioridad:** Alta  
**Descripción:** Cada cliente tiene `cupo_credito` y `dias_credito`. Una venta a crédito verifica que no exceda el cupo.

**Criterio de aceptación:**
- Cliente con cupo 500.000 intenta compra a crédito de 600.000 → sistema rechaza.
- Cliente con cupo 500.000 intenta compra a crédito de 400.000 → sistema acepta.

---

## Módulo: Caja

### FR-07 — Apertura de sesión de caja
**Prioridad:** Alta  
**Descripción:** Un cajero puede abrir una sesión de caja en un POS con un monto inicial.

**Criterio de aceptación:**
- POST `/caja/sesiones` con `punto_venta_id` y `monto_apertura` → 201.
- Si ya existe una sesión ABIERTA para ese POS → 409.

### FR-08 — Cierre de sesión de caja
**Prioridad:** Alta  
**Descripción:** Al cerrar una sesión, el sistema calcula el efectivo esperado según los movimientos y lo compara con el monto declarado.

**Criterio de aceptación:**
- PUT `/caja/sesiones/:id/cerrar` con `monto_declarado` → 200.
- El campo `diferencia` = `monto_declarado - monto_sistema_efectivo`.
- Si `diferencia != 0`, se requiere `autorizado_por_id`.

### FR-09 — Traslado entre cajas
**Prioridad:** Alta  
**Descripción:** El efectivo de una caja (ej. bar terraza) se puede trasladar a la caja central.

**Criterio de aceptación:**
- POST `/caja/traslados` crea dos movimientos: TRASLADO_SALIDA en origen y TRASLADO_ENTRADA en destino.
- Ambos movimientos comparten `contraparte_sesion_id`.
- El saldo de ambas sesiones se actualiza correctamente.

### FR-10 — Registro de gasto en efectivo
**Prioridad:** Alta  
**Descripción:** Un cajero puede registrar un gasto pagado en efectivo desde la caja, con adjunto opcional (escaneo de factura).

**Criterio de aceptación:**
- POST `/caja/gastos` con monto, descripción y opcionalmente `documento_adjunto_id` → 201.
- Se crea `movimiento_caja` tipo GASTO_EFECTIVO.
- Se crea asiento en `libro_movimiento` (debe gasto / haber caja).

### FR-11 — Registro de retiro del dueño
**Prioridad:** Alta  
**Descripción:** El dueño puede retirar efectivo de la caja. Se registra en `cuenta_socio` con tipo RETIRO.

**Criterio de aceptación:**
- POST `/caja/retiros-dueno` con monto y descripción → 201.
- Se crea `movimiento_caja` tipo RETIRO_DUENO.
- Se crea fila en `cuenta_socio` con tipo RETIRO.
- El saldo acumulado de la cuenta socio se actualiza.

---

## Módulo: Alojamiento

### FR-12 — Crear reserva
**Prioridad:** Alta  
**Descripción:** Un recepcionista puede crear una reserva con uno o varios huéspedes, con o sin anticipo, indicando modalidad (NOCHE o MENSUAL).

**Criterio de aceptación:**
- POST `/reservas` con datos válidos → 201.
- Si hay anticipo, se crea un `cobro` con `es_anticipo=true`.
- Se genera un `folio` MAESTRO asociado.
- Se valida que la habitación esté disponible en las fechas.

### FR-13 — Check-in
**Prioridad:** Alta  
**Descripción:** El recepcionista puede hacer check-in de una reserva, capturando los datos del huésped, asignando habitación y abriendo el folio.

**Criterio de aceptación:**
- POST `/reservas/:id/checkin` → 200.
- Se crea el registro en `huesped` con datos mínimos (nombre, documento).
- Se actualiza `reserva_habitacion.estado='CHECKIN'`.
- Se registra `hora_entrada_real` en la reserva.
- Se genera `folio_cargo` con la primera noche.

### FR-14 — Cargo manual al folio
**Prioridad:** Alta  
**Descripción:** El recepcionista puede agregar cargos al folio de un huésped (noche extra, huésped adicional, early/late check-in/out).

**Criterio de aceptación:**
- POST `/folios/:id/cargos` con concepto, monto y `centro_id` → 201.
- Se crea `folio_cargo` con el `centro_id` correcto.
- El saldo del folio se actualiza.

### FR-15 — Check-out con cobro
**Prioridad:** Alta  
**Descripción:** Al hacer check-out, el sistema cierra el folio, calcula el total y permite cobrar el saldo pendiente con el tipo de documento seleccionado.

**Criterio de aceptación:**
- POST `/folios/:id/checkout` con `tipo_documento` y `metodo_pago` → 200.
- Se crea `cobro` con el monto del saldo.
- Se crea asiento en `libro_movimiento` (debe caja/cxc, haber ingreso centro).
- `folio.estado='CERRADO'`.
- Se registra `hora_salida_real` en la reserva.

### FR-16 — Cuenta por cobrar a empresa
**Prioridad:** Alta  
**Descripción:** Al cerrar un folio cuyo responsable es una empresa con crédito, se crea una cuenta por cobrar en lugar de cobrar en caja.

**Criterio de aceptación:**
- POST `/folios/:id/checkout` con `metodo_pago='CREDITO'` y responsable tipo EMPRESA → 200.
- Se crea `cuenta_cobrar` con `fecha_vencimiento` calculada según `cliente.dias_credito`.
- `folio.estado='CERRADO'` y `folio.estado='FACTURADO'` si se emitió factura.

### FR-17 — Abono a cuenta por cobrar
**Prioridad:** Alta  
**Descripción:** Un cobrador puede registrar abonos a cuentas por cobrar de empresas o empleados.

**Criterio de aceptación:**
- POST `/cuentas-cobrar/:id/abonos` con monto → 201.
- Se actualiza `cuenta_cobrar.saldo`.
- Se crea `cobro` con `tipo_cobro='ABONO_CXC'`.
- Si saldo = 0, `cuenta_cobrar.estado='PAGADA'`.

### FR-18 — Adjuntos de recibos
**Prioridad:** Media  
**Descripción:** Se puede adjuntar el escaneo de un recibo firmado por un técnico o de una factura sin datos de empresa.

**Criterio de aceptación:**
- POST `/adjuntos` con archivo → 201.
- El archivo queda en Supabase Storage.
- Se registra en `documento_adjunto` con `referencia_tipo` y `referencia_id`.

---

## Módulo: Reportes

### FR-19 — Reporte de ingresos del día
**Prioridad:** Alta  
**Descripción:** Reporte que muestra los ingresos del día agrupados por centro.

**Criterio de aceptación:**
- GET `/reportes/ingresos?fecha=YYYY-MM-DD` → JSON con `centro`, `total`.
- Exportable a PDF.

### FR-20 — Reporte de ocupación
**Prioridad:** Alta  
**Descripción:** Reporte que muestra el porcentaje de ocupación actual.

**Criterio de aceptación:**
- GET `/reportes/ocupacion` → `habitaciones_ocupadas`, `habitaciones_totales`, `porcentaje`.
- Se puede filtrar por fecha.

### FR-21 — Reporte de cartera por empresa
**Prioridad:** Alta  
**Descripción:** Reporte de cuentas por cobrar agrupadas por empresa, con estado y vencimiento.

**Criterio de aceptación:**
- GET `/reportes/cartera?cliente_id=X` → lista de cuentas con estado y saldo.
- Exportable a PDF y Excel.

### FR-22 — Reporte de resultado por centro
**Prioridad:** Alta  
**Descripción:** Reporte mensual del margen de cada centro (ingresos - costos directos).

**Criterio de aceptación:**
- GET `/reportes/resultado-centros?mes=YYYY-MM` → tabla con `centro`, `ingresos`, `costos`, `margen`.
- Consulta validada contra las 5 consultas de `design.md`.

### FR-23 — Reporte de cuadre de caja
**Prioridad:** Alta  
**Descripción:** Reporte del cierre de una sesión de caja con movimientos y diferencia.

**Criterio de aceptación:**
- GET `/reportes/cuadre-caja/:sesion_id` → detalle de movimientos, monto sistema, monto declarado, diferencia.
- Exportable a PDF.

---

## Módulo: Parametrización

### FR-24 — Carga inicial de datos por CSV
**Prioridad:** Alta  
**Descripción:** Un script permite cargar los datos maestros iniciales desde archivos CSV, sin necesidad de insertar a mano.

**Criterio de aceptación:**
- Script `npm run seed` lee archivos de `/seeds/*.csv` y los inserta transaccionalmente.
- Es idempotente: ejecutarlo dos veces no duplica datos.
- Si un CSV tiene error, hace rollback completo y reporta el error.

---

## Definición de "terminado" (DoD)

Cada FR se considera terminado cuando:
- [ ] El código está commiteado en rama feature.
- [ ] Tiene tests unitarios y de integración.
- [ ] Pasa los criterios de aceptación.
- [ ] Está documentado en OpenAPI (Swagger).
- [ ] Fue validado por el responsable del proyecto.