# Tasks — Fase 1A: Núcleo Financiero + Alojamiento Mínimo

**Versión:** 1.0  
**Fecha:** 2026-11-13  
**Basado en:** SPEC.md v1.0

Cada tarea es atómica (1–2 horas de trabajo del agente) y tiene:
- Objetivo claro
- Archivos que toca
- Pasos concretos
- Criterio de aceptación verificable
- Lista explícita de "No hacer en esta tarea"

**Regla:** El agente ejecuta las tareas UNA A UNA. No avanza a la siguiente hasta que la anterior pase los criterios de aceptación y se commitee.

---

## Bloque 0 — Configuración del proyecto

### T1.1 — Crear repositorio y estructura base

**Objetivo:** Inicializar el repositorio con la estructura de carpetas del proyecto.

**Pasos:**
1. Crear repo en GitHub.
2. Crear estructura:
   ```
   /docs          → SPEC.md, requirements.md, design.md, tasks.md, design-system.md
   /backend       → Node.js
   /frontend      → React + Vite
   /seeds         → CSVs de datos iniciales
   ```
3. Crear `.gitignore` para Node.js.
4. Crear `README.md` con instrucciones de instalación.

**Criterio de aceptación:**
- [ ] El repo existe en GitHub.
- [ ] La estructura de carpetas está commiteada.
- [ ] El README explica cómo instalar y correr el proyecto.

**No hacer:** No inicializar todavía backend ni frontend. Solo la estructura.

---

### T1.2 — Configurar backend Node.js

**Objetivo:** Inicializar el backend con Express, TypeScript y dependencias base.

**Archivos:**
- `backend/package.json`
- `backend/tsconfig.json`
- `backend/src/index.ts`
- `backend/.env.example`

**Pasos:**
1. `npm init -y` en `/backend`.
2. Instalar: `express`, `typescript`, `ts-node`, `dotenv`, `@supabase/supabase-js`, `jsonwebtoken`, `bcrypt`, `zod`.
3. Instalar dev: `@types/express`, `@types/node`, `@types/jsonwebtoken`, `@types/bcrypt`, `nodemon`.
4. Configurar `tsconfig.json` con `strict: true`.
5. Crear `src/index.ts` con servidor Express básico y endpoint `/health`.
6. Crear `.env.example` con `PORT`, `DATABASE_URL`, `JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_KEY`.

**Criterio de aceptación:**
- [ ] `npm run dev` levanta el servidor en `localhost:3000`.
- [ ] `GET /health` responde `{ status: 'ok' }`.
- [ ] El proyecto compila sin errores de TypeScript.

**No hacer:** No crear endpoints de negocio todavía. Solo el health check.

---

### T1.3 — Configurar frontend React + Vite + Tailwind

**Objetivo:** Inicializar el frontend con la paleta de colores del hotel.

**Archivos:**
- `frontend/` (todo)
- `frontend/tailwind.config.js`
- `frontend/src/index.css`

**Pasos:**
1. `npm create vite@latest frontend -- --template react-ts`.
2. Instalar `tailwindcss`, `postcss`, `autoprefixer`, `motion`.
3. Configurar Tailwind con los tokens de `design-system.md`:
   - Colores: `navy-dark`, `navy`, `navy-light`, `gold-light`, `gold`, `gold-dark`, `cream`, `cream-dark`, `stone`, `stone-light`, `success`, `warning`, `error`, `info`, `whatsapp`.
   - Fuentes: `Playfair Display` (display) y `DM Sans` (body).
4. Importar fuentes de Google Fonts en `index.html`.
5. Crear página de login básica (sin lógica aún).

**Criterio de aceptación:**
- [ ] `npm run dev` levanta en `localhost:5173`.
- [ ] La página muestra el título "New Magdalena Hotel" con fuente Playfair.
- [ ] Los colores de Tailwind están disponibles como `bg-navy`, `text-gold`, etc.

**No hacer:** No implementar lógica de autenticación todavía.

---

### T1.4 — Conectar Supabase

**Objetivo:** Configurar Supabase y conectar backend y frontend.

**Pasos:**
1. Crear proyecto en Supabase.
2. Obtener `SUPABASE_URL`, `SUPABASE_ANON_KEY` y `DATABASE_URL`.
3. Agregar al `.env` del backend y `frontend/.env`.
4. Configurar cliente de Supabase en backend (`src/lib/supabase.ts`).
5. Configurar cliente de Supabase en frontend (`src/lib/supabase.ts`).

**Criterio de aceptación:**
- [ ] Backend puede hacer una query simple a Supabase (ej. `SELECT 1`).
- [ ] Frontend puede conectarse a Supabase Auth.
- [ ] Las variables de entorno no están commiteadas.

**No hacer:** No ejecutar migraciones todavía.

---

## Bloque 1 — Base de datos

### T1.5 — Ejecutar migraciones 001–008 (núcleo financiero)

**Objetivo:** Crear las tablas del núcleo financiero en Supabase.

**Archivos:**
- `backend/migrations/001_config.sql` a `008_documento_adjunto.sql`

**Pasos:**
1. Copiar el SQL de cada migración desde `design.md`.
2. Ejecutarlas en orden en Supabase (via SQL Editor o CLI).
3. Verificar que todas las tablas existan.

**Criterio de aceptación:**
- [ ] Las 8 migraciones corren sin errores.
- [ ] `SELECT COUNT(*) FROM centro` devuelve 8.
- [ ] `SELECT COUNT(*) FROM cuenta` devuelve al menos 22.
- [ ] `SELECT COUNT(*) FROM punto_venta` devuelve al menos 3.
- [ ] El usuario `admin` existe en `usuario`.

**No hacer:** No ejecutar migraciones 009 en adelante todavía.

---

### T1.6 — Ejecutar migraciones 009–012 (alojamiento)

**Objetivo:** Crear las tablas del módulo de alojamiento.

**Archivos:**
- `backend/migrations/009_habitaciones.sql` a `012_cobros_cxc.sql`

**Pasos:**
1. Copiar el SQL de cada migración desde `design.md`.
2. Ejecutarlas en orden.

**Criterio de aceptación:**
- [ ] Las 4 migraciones corren sin errores.
- [ ] `SELECT COUNT(*) FROM habitacion` funciona (puede estar vacía).
- [ ] `SELECT COUNT(*) FROM reserva` funciona.

**No hacer:** No crear datos de prueba todavía.

---

### T1.7 — Script de seed desde CSV

**Objetivo:** Crear un script que cargue habitaciones, tarifas y usuarios desde archivos CSV.

**Archivos:**
- `seeds/habitaciones.csv`
- `seeds/tipos_habitacion.csv`
- `seeds/tarifas.csv`
- `backend/src/scripts/seed.ts`

**Pasos:**
1. Crear los CSV con datos reales del hotel (habitaciones, tipos, tarifas).
2. Implementar script en TypeScript que:
   - Lea cada CSV.
   - Inserte los registros en orden (tipos → habitaciones → tarifas).
   - Sea idempotente (usar `ON CONFLICT DO NOTHING` o verificar antes de insertar).
   - Haga rollback completo si falla un archivo.
3. Agregar comando `npm run seed` en `package.json`.

**Criterio de aceptación:**
- [ ] `npm run seed` carga los datos sin errores.
- [ ] Ejecutarlo dos veces no duplica datos.
- [ ] Si un CSV tiene error, hace rollback y reporta el problema.

**No hacer:** No cargar datos de clientes ni reservas de prueba.

---

## Bloque 2 — Autenticación y RBAC

### T1.8 — Endpoint de login

**Objetivo:** Implementar `POST /auth/login`.

**Archivos:**
- `backend/src/modules/auth/auth.routes.ts`
- `backend/src/modules/auth/auth.service.ts`
- `backend/src/middleware/auth.middleware.ts`

**Pasos:**
1. Implementar verificación de password con bcrypt.
2. Generar JWT con `usuario_id`, `rol` y expiración de 8h.
3. Implementar middleware `verifyToken` para proteger rutas.
4. Implementar middleware `requireRole(['ADMIN'])` para autorización.

**Criterio de aceptación:**
- [ ] `POST /auth/login` con credenciales válidas → 200 + JWT.
- [ ] Con credenciales inválidas → 401.
- [ ] `GET /auth/me` con JWT válido → datos del usuario.
- [ ] `GET /auth/me` sin JWT → 401.

**No hacer:** No implementar registro de usuarios todavía.

---

### T1.9 — Pantalla de login en frontend

**Objetivo:** Implementar la UI de login conectada al backend.

**Archivos:**
- `frontend/src/pages/Login.tsx`
- `frontend/src/lib/api.ts`

**Pasos:**
1. Formulario con username y password.
2. Llamada a `POST /auth/login`.
3. Guardar JWT en localStorage.
4. Redirigir a `/dashboard` si login exitoso.
5. Mostrar error si credenciales inválidas.

**Criterio de aceptación:**
- [ ] El login funciona con el usuario admin.
- [ ] El JWT se guarda correctamente.
- [ ] Si las credenciales son inválidas, se muestra un toast de error.

**No hacer:** No implementar logout ni refresh token todavía.

---

## Bloque 3 — CRUDs básicos

### T1.10 — CRUD de clientes (backend)

**Objetivo:** Implementar endpoints de clientes.

**Archivos:**
- `backend/src/modules/clientes/clientes.routes.ts`
- `backend/src/modules/clientes/clientes.service.ts`

**Pasos:**
1. `GET /clientes` con filtros por tipo, documento, razón social.
2. `GET /clientes/:id`.
3. `POST /clientes`.
4. `PUT /clientes/:id`.
5. `DELETE /clientes/:id` (soft delete).

**Criterio de aceptación:**
- [ ] Todos los endpoints funcionan con JWT válido.
- [ ] Búsqueda por documento retorna el cliente correcto.
- [ ] El soft delete no borra físicamente.

**No hacer:** No implementar validación de cupo de crédito todavía (eso es T1.16).

---

### T1.11 — CRUD de habitaciones y tarifas (backend)

**Objetivo:** Endpoints para gestionar habitaciones, tipos y tarifas.

**Pasos:**
1. CRUD de `tipo_habitacion`.
2. CRUD de `habitacion`.
3. CRUD de `tarifa`.
4. Endpoint `GET /habitaciones/disponibles?desde=X&hasta=Y` que retorna habitaciones libres en un rango.

**Criterio de aceptación:**
- [ ] Se puede crear una habitación y consultarla.
- [ ] El endpoint de disponibilidad no retorna habitaciones con reservas activas en esas fechas.

**No hacer:** No implementar mapa visual de habitaciones todavía.

---

### T1.12 — CRUD de cajas y sesiones (backend)

**Objetivo:** Implementar endpoints de caja.

**Pasos:**
1. `POST /caja/sesiones` — abrir sesión.
2. `PUT /caja/sesiones/:id/cerrar` — cerrar sesión con cálculo de diferencia.
3. `POST /caja/traslados` — traslado entre cajas (crea TRASLADO_SALIDA + TRASLADO_ENTRADA).
4. `POST /caja/gastos` — gasto en efectivo.
5. `POST /caja/retiros-dueno` — retiro del dueño (crea `cuenta_socio`).
6. `GET /caja/sesiones/:id` — detalle de sesión con movimientos.

**Criterio de aceptación:**
- [ ] No se puede abrir dos sesiones en el mismo POS (constraint).
- [ ] El cierre calcula correctamente el efectivo esperado.
- [ ] El traslado crea dos movimientos vinculados por `contraparte_sesion_id`.
- [ ] El retiro del dueño crea fila en `cuenta_socio`.

**No hacer:** No implementar reportes de caja todavía (T1.23).

---

## Bloque 4 — Alojamiento (flujo crítico)

### T1.13 — Crear reserva (backend)

**Objetivo:** Implementar `POST /reservas`.

**Pasos:**
1. Validar disponibilidad de habitaciones.
2. Crear `reserva` + `reserva_habitacion`.
3. Generar código único de reserva.
4. Si hay anticipo, crear `cobro` con `es_anticipo=true`.
5. Crear `folio` MAESTRO.
6. Registrar asientos en `libro_movimiento` si hay anticipo.

**Criterio de aceptación:**
- [ ] Se puede crear una reserva walk-in sin anticipo.
- [ ] Se puede crear una reserva con anticipo del 50%.
- [ ] El folio MAESTRO se crea correctamente.
- [ ] El anticipo genera asiento contable (debe caja / haber ingreso diferido).

**No hacer:** No implementar extensiones ni cambios de habitación todavía (Fase 1B).

---

### T1.14 — Check-in (backend)

**Objetivo:** Implementar `POST /reservas/:id/checkin`.

**Pasos:**
1. Validar que la reserva esté en estado `CONFIRMADA` o `PENDIENTE`.
2. Crear registros en `huesped`.
3. Actualizar `reserva_habitacion.estado='CHECKIN'`.
4. Registrar `hora_entrada_real`.
5. Generar `folio_cargo` de la primera noche.
6. Actualizar `habitacion.estado='OCUPADA'`.

**Criterio de aceptación:**
- [ ] Se puede hacer check-in de una reserva existente.
- [ ] El folio tiene al menos un cargo (primera noche).
- [ ] La habitación cambia a estado OCUPADA.

**No hacer:** No implementar envío de WhatsApp todavía (Fase 2).

---

### T1.15 — Cargo manual al folio (backend)

**Objetivo:** Implementar `POST /folios/:id/cargos`.

**Pasos:**
1. Recibir concepto, monto, `centro_id`, cantidad.
2. Crear `folio_cargo`.
3. Actualizar `folio.saldo`.
4. Si es cortesía, validar `autorizado_por_id`.

**Criterio de aceptación:**
- [ ] Se puede agregar un cargo de noche extra.
- [ ] Se puede agregar un cargo de huésped extra.
- [ ] El saldo del folio se actualiza correctamente.
- [ ] Una cortesía requiere autorización.

**No hacer:** No implementar cargos automáticos por early/late check-in todavía (Fase 1B).

---

### T1.16 — Check-out y cobro (backend)

**Objetivo:** Implementar `POST /folios/:id/checkout`.

**Pasos:**
1. Calcular saldo del folio.
2. Recibir `tipo_documento` y `metodo_pago`.
3. Si `metodo_pago='EFECTIVO'`, requerir `sesion_caja_id`.
4. Si `metodo_pago='CREDITO'` y responsable es EMPRESA, crear `cuenta_cobrar`.
5. Crear `cobro`.
6. Generar asientos en `libro_movimiento`:
   - Debe caja/cxc / Haber ingreso (por cada centro).
7. Cerrar folio.
8. Actualizar habitación a `LIMPIEZA`.
9. Registrar `hora_salida_real`.

**Criterio de aceptación:**
- [ ] Check-out con efectivo cierra folio y registra cobro.
- [ ] Check-out a crédito de empresa crea cuenta por cobrar.
- [ ] Los asientos contables son correctos (suma debe = suma haber).
- [ ] La habitación cambia a estado LIMPIEZA.

**No hacer:** No implementar facturación electrónica todavía (Fase 3).

---

### T1.17 — Abonos a cuenta por cobrar (backend)

**Objetivo:** Implementar `POST /cuentas-cobrar/:id/abonos`.

**Pasos:**
1. Crear `cobro` con `tipo_cobro='ABONO_CXC'`.
2. Crear `cuenta_cobrar_pago`.
3. Actualizar saldo de `cuenta_cobrar`.
4. Si saldo = 0, cambiar estado a `PAGADA`.
5. Registrar asiento en `libro_movimiento`.

**Criterio de aceptación:**
- [ ] El abono reduce el saldo correctamente.
- [ ] Si el saldo llega a 0, el estado cambia a PAGADA.
- [ ] El asiento contable es correcto.

**No hacer:** No implementar conciliación bancaria todavía.

---

## Bloque 5 — Frontend operativo

### T1.18 — Pantalla de check-in

**Objetivo:** UI de check-in en menos de 2 minutos.

**Pasos:**
1. Búsqueda de reserva por código o documento.
2. Si no existe, botón "Walk-in directo".
3. Formulario de datos del huésped.
4. Selector de habitación disponible.
5. Confirmación con resumen.
6. Botón "Check-in" que llama al backend.

**Criterio de aceptación:**
- [ ] El flujo completo toma menos de 2 minutos.
- [ ] La UI usa los colores y tipografía del design system.
- [ ] Al confirmar, se muestra toast de éxito y se redirige al folio.

**No hacer:** No implementar check-in con múltiples huéspedes en esta tarea (T1.22).

---

### T1.19 — Pantalla de folio y check-out

**Objetivo:** UI para ver folio, agregar cargos y hacer check-out.

**Pasos:**
1. Mostrar detalle del folio con todos los cargos.
2. Botón "Agregar cargo".
3. Botón "Check-out" con modal de cobro.
4. Modal con: tipo de documento, método de pago, monto.
5. Confirmar y cerrar folio.

**Criterio de aceptación:**
- [ ] El folio muestra todos los cargos con centro.
- [ ] Se puede agregar un cargo manualmente.
- [ ] El check-out con efectivo funciona.
- [ ] El check-out a crédito funciona.

**No hacer:** No implementar impresión de tirilla todavía (T1.20).

---

### T1.20 — Impresión de recibo de caja (PDF y térmica)

**Objetivo:** Generar PDF y tirilla térmica de recibo de caja.

**Pasos:**
1. Backend: generar PDF con `pdfkit` con logo, datos del hotel, detalle de cobro.
2. Backend: generar comando ESC/POS para impresora térmica.
3. Frontend: botón "Imprimir recibo" que descarga PDF.
4. Endpoint `GET /cobros/:id/pdf`.

**Criterio de aceptación:**
- [ ] El PDF se genera con el diseño del hotel.
- [ ] El PDF incluye todos los datos del cobro.
- [ ] La tirilla térmica sale correctamente en una impresora 80mm.

**No hacer:** No implementar impresión de factura electrónica todavía (Fase 3).

---

### T1.21 — Pantalla de caja (apertura, cierre, traslados)

**Objetivo:** UI para operar la caja.

**Pasos:**
1. Pantalla de apertura de sesión.
2. Pantalla de operación (movimientos del día).
3. Pantalla de cierre con input de monto declarado y cálculo de diferencia.
4. Modal de traslado entre cajas.

**Criterio de aceptación:**
- [ ] Se puede abrir una sesión.
- [ ] Se puede cerrar con diferencia registrada.
- [ ] El traslado crea los dos movimientos vinculados.
- [ ] Se muestra el efectivo esperado antes de cerrar.

**No hacer:** No implementar reporte de cuadre todavía (T1.26).

---

## Bloque 6 — Reportes

### T1.22 — Reporte de ingresos del día por centro

**Objetivo:** Endpoint y pantalla de ingresos del día.

**Pasos:**
1. Backend: `GET /reportes/ingresos?fecha=YYYY-MM-DD`.
2. Query que agrupa `libro_movimiento` por centro y cuenta de ingreso.
3. Frontend: pantalla con tabla y botón "Exportar PDF".

**Criterio de aceptación:**
- [ ] El reporte muestra ingresos por centro correctamente.
- [ ] El PDF se exporta con el diseño del hotel.

**No hacer:** No implementar reportes comparativos todavía.

---

### T1.23 — Reporte de ocupación

**Objetivo:** Mostrar ocupación actual.

**Pasos:**
1. `GET /reportes/ocupacion`.
2. Query que cuenta habitaciones ocupadas vs totales.
3. Frontend: card de KPI en dashboard.

**Criterio de aceptación:**
- [ ] El KPI muestra porcentaje correcto.
- [ ] Se actualiza en tiempo real.

**No hacer:** No implementar histórico de ocupación todavía.

---

### T1.24 — Reporte de cartera por empresa

**Objetivo:** Mostrar cuentas por cobrar de empresas.

**Pasos:**
1. `GET /reportes/cartera?cliente_id=X`.
2. Query que lista cuentas con saldo y vencimiento.
3. Frontend: tabla con filtros por estado.
4. Botón "Exportar PDF" y "Exportar Excel".

**Criterio de aceptación:**
- [ ] El reporte muestra todas las cuentas pendientes.
- [ ] Las vencidas aparecen en rojo.
- [ ] Exporta a PDF y Excel.

**No hacer:** No implementar envío automático por email todavía.

---

### T1.25 — Reporte de resultado por centro

**Objetivo:** Mostrar margen mensual por centro.

**Pasos:**
1. `GET /reportes/resultado-centros?mes=YYYY-MM`.
2. Usar la consulta 4 de `design.md`.
3. Frontend: tabla con ingresos, costos y margen.

**Criterio de aceptación:**
- [ ] Los totales cuadran con el libro de movimientos.
- [ ] El margen se calcula correctamente.

**No hacer:** No implementar prorrateo de gastos indirectos todavía (Fase 2).

---

### T1.26 — Cuadre de caja por turno

**Objetivo:** Reporte de cierre de sesión.

**Pasos:**
1. `GET /reportes/cuadre-caja/:sesion_id`.
2. Mostrar todos los movimientos, monto sistema, monto declarado, diferencia.
3. Botón "Exportar PDF".

**Criterio de aceptación:**
- [ ] El reporte muestra el detalle completo.
- [ ] La diferencia se muestra correctamente.
- [ ] El PDF se puede imprimir.

**No hacer:** No implementar firma del cajero todavía.

---

## Bloque 7 — Documentación y cierre

### T1.27 — Manual de usuario para recepcionistas

**Objetivo:** Documento SOP para el personal.

**Pasos:**
1. Crear `docs/manual-recepcionista.md`.
2. Incluir capturas de pantalla de cada flujo.
3. Pasos detallados para: check-in, check-out, cierre de caja, cobro.

**Criterio de aceptación:**
- [ ] Una persona sin conocimiento técnico puede seguir el manual.
- [ ] Está validado con al menos un recepcionista real.

**No hacer:** No implementar ayuda dentro de la app todavía.

---

### T1.28 — Validar criterios de aceptación de la fase

**Objetivo:** Verificar que todos los criterios del SPEC se cumplen.

**Pasos:**
1. Ejecutar las 5 consultas de validación de `design.md`.
2. Verificar los 9 criterios de aceptación del SPEC (sección 6).
3. Documentar resultados en `docs/cierre-fase-1a.md`.

**Criterio de aceptación:**
- [ ] Todos los criterios del SPEC están marcados como cumplidos.
- [ ] Las 5 consultas devuelven datos coherentes.
- [ ] El sistema puede operar el hotel en producción.

**No hacer:** No arrancar Fase 1B hasta que esto esté completo.

---

## Resumen de tareas

| Bloque | Tareas | Total |
|---|---|---|
| 0. Configuración | T1.1 – T1.4 | 4 |
| 1. Base de datos | T1.5 – T1.7 | 3 |
| 2. Auth y RBAC | T1.8 – T1.9 | 2 |
| 3. CRUDs básicos | T1.10 – T1.12 | 3 |
| 4. Alojamiento | T1.13 – T1.17 | 5 |
| 5. Frontend | T1.18 – T1.21 | 4 |
| 6. Reportes | T1.22 – T1.26 | 5 |
| 7. Cierre | T1.27 – T1.28 | 2 |
| **Total** | | **28 tareas** |