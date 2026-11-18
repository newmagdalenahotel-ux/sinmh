# SPEC — Fase 1A: Núcleo Financiero + Alojamiento Mínimo

**Versión:** 1.0  
**Fecha:** 2026-11-13  
**Estado:** Aprobado para implementación  
**Responsable:** Dueño del proyecto

---

## 1. Propósito

Implementar el núcleo financiero y el módulo de alojamiento del sistema del Hotel New Magdalena, de modo que el hotel pueda operar su negocio principal (alojamiento) con caja, folios, check-in/check-out, cobros y reportes básicos, sobre una base de datos diseñada para soportar todas las fases futuras sin refactorización.

Al finalizar esta fase, el hotel podrá:
- Registrar reservas walk-in y con anticipo.
- Hacer check-in y check-out de huéspedes.
- Cargar consumos manuales al folio (noches adicionales, huésped extra, early/late check-in/out).
- Cobrar con tres tipos de documento (ninguno, recibo de caja, factura electrónica).
- Manejar cuentas por cobrar a empresas y empleados.
- Operar la caja central con cierres por turno y traslados desde otras cajas.
- Consultar ingresos del día, ocupación, cartera y resultado por centro.

---

## 2. Alcance — Lo que SÍ entra

### 2.1 Núcleo financiero
- Autenticación (JWT) y autorización por roles (RBAC): ADMIN, GERENTE, RECEPCION, CAJERO.
- CRUD de usuarios, roles y permisos.
- CRUD de centros (ALOJAMIENTO, BAR_RECEPCION, BAR_TERRAZA, RESTAURANTE, EVENTOS, PISCINA_PASADIA, LAVANDERIA, TOUR_REPRESA).
- CRUD de cuentas contables (plan mínimo).
- Libro de movimientos financieros con doble partida (debe/haber).
- Cuenta socio para retiros y aportes del dueño.

### 2.2 Caja
- Caja física central + cajas físicas por POS.
- Apertura y cierre de sesiones de caja por turno.
- Cálculo de efectivo esperado vs declarado al cierre, con registro de diferencia.
- Registro de gastos en efectivo, retiros de bóveda, aportes de pago.
- Traslados entre cajas (TRASLADO_SALIDA / TRASLADO_ENTRADA con `contraparte_sesion_id`).
- Adjuntos (escaneo de recibos y comprobantes).

### 2.3 Clientes
- Cliente tipo PARTICULAR, EMPRESA, EMPLEADO, GRUPO_TRABAJO, SOCIO.
- Cupo de crédito y días de crédito por cliente.
- Búsqueda por documento, razón social o nombre.

### 2.4 Alojamiento
- CRUD de tipos de habitación, habitaciones y tarifas (modalidad NOCHE y MENSUAL).
- Reservas con anticipo (abono del 50% típico) y política de cancelación.
- Reservas multi-habitación con múltiples huéspedes.
- Check-in con captura de datos del huésped.
- Folio jerárquico (MAESTRO + HIJOS) con responsable de pago configurable.
- Cargos manuales al folio: noches adicionales, huésped extra, early/late check-in/out.
- Check-out con cierre de folio.
- Contrato de hospedaje (formato básico, sin firma electrónica en esta fase).

### 2.5 Cobros
- Cobro con tres tipos de documento: NINGUNO, RECIBO_CAJA, FACTURA_ELECTRONICA.
- Métodos de pago: EFECTIVO, TARJETA, TRANSFERENCIA, CREDITO.
- Cuentas por cobrar a empresas y empleados.
- Registro de abonos a cuentas por cobrar.
- Conciliación de pagos recibidos por el dueño (cuenta por cobrar al socio).

### 2.6 Reportes
- Ingresos del día y del mes por centro.
- Ocupación actual (habitaciones ocupadas / total).
- Cartera de empresas (pendientes, vencidas, pagadas).
- Habitaciones ocupadas hoy con identificación de quién paga cada una.
- Resultado operativo por centro del mes.
- Cuadre de caja por turno.
- Cortesías y descuentos del mes.
- Exportación de reportes a PDF y Excel.

### 2.7 Parametrización inicial
- Script de seed transaccional que carga desde CSV: habitaciones, tarifas, usuarios, plan de cuentas, centros, puntos de venta.
- El script debe ser idempotente (puede ejecutarse varias veces sin duplicar datos).

---

## 3. Fuera de alcance — Lo que NO entra en esta fase

| Módulo | Fase en que entra |
|---|---|
| POS de bares y restaurante | Fase 1C |
| Taquilla piscina / pasadías | Fase 1C |
| Eventos (piscina + baño, piscina + parqueadero) | Fase 2 |
| Paquetes turísticos (tour Represa de Prado) | Fase 2 |
| Inventario de productos (bebidas, snacks) | Fase 1C |
| Inventario de mobiliario / activos fijos | Fase 1C |
| Descuentos condicionales automáticos | Fase 1B |
| Contratos de mensualidad con firma | Fase 1B |
| Extensiones y cambios de habitación | Fase 1B |
| Averías y limpieza de habitaciones | Fase 1C |
| Turnos de personal | Fase 1C |
| Compras y proveedores | Fase 1C |
| WhatsApp Cloud API | Fase 2 |
| Facturación electrónica DIAN | Fase 3 |
| Reservas online desde la web pública | Fase 3 |
| App móvil nativa | No aplica — PWA |
| Modo oscuro | Fase 1C (postergado) |

---

## 4. Reglas de negocio no negociables

Estas reglas aplican a TODAS las tareas y NO pueden ser modificadas sin actualizar este documento primero:

1. **Todo movimiento de dinero debe registrarse en `libro_movimiento`** con doble partida (debe/haber). No existe excepción.
2. **Todo `folio_cargo` debe tener `centro_id` obligatorio.** Si no tiene centro, no se guarda.
3. **`cobro` con tres tipos de documento**: `NINGUNO`, `RECIBO_CAJA`, `FACTURA_ELECTRONICA`. El cobro siempre se registra; lo que cambia es si además se emite un documento.
4. **Una sola sesión de caja `ABIERTA` por `punto_venta` a la vez.** Se garantiza con índice único parcial.
5. **Los retiros del dueño se registran en `cuenta_socio`**, no como gasto directo.
6. **Los consumos de empleados se registran como `cliente.tipo='EMPLEADO'`** con cupo y cuenta por cobrar. No se descuentan directamente de nómina.
7. **Los pagos con tarjeta o transferencia que lleguen a cuentas del dueño se registran como `cobro` con `cuenta_destino='DUENO'`** y generan cuenta por cobrar al socio. Nunca se omiten.
8. **Las cortesías se registran como `folio_cargo` con `monto=0` y `es_cortesia=true`**, con `autorizado_por_id` obligatorio. No se registran como gasto.
9. **El efectivo de las cajas de bar terraza y restaurante debe trasladarse a la caja central al final del turno** con `TRASLADO_SALIDA` y `TRASLADO_ENTRADA` vinculados por `contraparte_sesion_id`.
10. **Ninguna venta puede bloquearse por falta de cliente.** `cliente_id` es nullable; `tipo_cliente` es obligatorio.

---

## 5. Decisiones de arquitectura tomadas

| Decisión | Valor |
|---|---|
| Base de datos | PostgreSQL 14+ (Supabase) |
| Backend | Node.js (Express/NestJS) |
| Frontend | React + Vite + Tailwind CSS |
| Autenticación | JWT + Supabase Auth |
| Migraciones | Scripts SQL versionados por número secuencial |
| Despliegue frontend | Vercel o Netlify |
| Despliegue backend | Railway o Render |
| Archivos adjuntos | Supabase Storage |
| Impresión térmica | ESC/POS desde backend (`node-escpos` o similar) |
| Generación de PDF | Backend con `pdfkit` |
| Backups | Supabase Pro (diario 7 días) + PITR + `supabase db dump` semanal a almacenamiento externo |
| Modo oscuro | Postergado a Fase 1C |
| WhatsApp | Fase 2, con API oficial de Meta (Coexistencia para mantener la app en el teléfono) |

---

## 6. Criterio de aceptación de la fase

La Fase 1A se considera terminada cuando:

- [ ] Las migraciones 001–012 y 025 corren limpias en una base de datos vacía de Supabase.
- [ ] El script de seed carga sin errores los CSV de habitaciones, usuarios y plan de cuentas.
- [ ] Un recepcionista puede hacer un check-in walk-in completo (reserva → habitación → huésped → folio → cobro) en menos de 2 minutos.
- [ ] Un recepcionista puede hacer un check-out completo con cobro en efectivo y cierre de folio.
- [ ] El cierre de turno calcula el efectivo esperado correctamente y registra la diferencia.
- [ ] Un cobro con tarjeta al dueño genera cuenta por cobrar al socio.
- [ ] Las 5 consultas de validación de `design.md` devuelven datos coherentes.
- [ ] Se puede generar un PDF de recibo de caja y un PDF de reporte de ingresos del día.
- [ ] El manual de usuario (SOP) para recepcionistas está redactado y probado con al menos una persona del equipo.

---

## 7. Cómo se trabaja con esta fase

1. El agente (Antigravity u otro) lee este SPEC completo antes de proponer cualquier plan.
2. El agente lee `requirements.md` para conocer los FRs y sus criterios de aceptación.
3. El agente consulta `design.md` (sección de la migración correspondiente) para el esquema SQL.
4. El agente ejecuta las tareas de `tasks.md` **una a una**, en orden.
5. Si algo es ambiguo, el agente pregunta antes de asumir. **Nunca improvisa.**
6. Si una tarea revela que este SPEC está incompleto, se detiene y propone actualizar el SPEC antes de continuar.

---

## 8. Glosario

- **Centro:** unidad de negocio con ingresos o costes propios (Alojamiento, Bar, Piscina, etc.).
- **POS:** punto de venta lógico asociado a un centro y a una caja física.
- **Sesión de caja:** turno de un POS, desde apertura hasta cierre.
- **Folio:** cuenta del huésped donde se acumulan cargos hasta el check-out.
- **Folio maestro:** agrupa varios folios hijos (ej. empresa con varios colaboradores).
- **Cortesía:** cargo al folio con monto 0 y autorización explícita.
- **Anticipo:** pago parcial al crear una reserva.
- **Cuenta socio:** registro de dinero que el hotel debe al dueño o viceversa.
- **TRASLADO_SALIDA / TRASLADO_ENTRADA:** movimiento de efectivo entre cajas físicas.