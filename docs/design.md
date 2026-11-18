# Design — Sistema Hotel New Magdalena

> **Documento vigente de diseño.** Define la arquitectura del frontend, las
> pantallas y el esquema objetivo de base de datos. La implementación real está
> en `backend/migrations` y se contrasta con este documento antes de cada tarea.

**Versión:** 3.0
**Fecha:** 2026-11-18
**Estado:** Aprobado para la fase actual
**Basado en:** SPEC.md v3.0

Este documento contiene el mapa de módulos y pantallas del frontend y el esquema
de base de datos organizado por migraciones. La implementación actual está
consolidada en las migraciones 001–009; las migraciones 010–025 del diseño
original quedan como objetivo de las fases siguientes.

---

## Convenciones

- **Base de datos:** PostgreSQL 14+ compatible. En la v1 se usa PGlite local en
  `backend/.data`; el mismo SQL debe poder ejecutarse en PostgreSQL real.
- **Dinero:** `NUMERIC(14,2)` — nunca FLOAT
- **Fechas:** `TIMESTAMPTZ` siempre
- **PKs:** `BIGSERIAL`
- **Soft delete:** `activo BOOLEAN` donde aplique
- **Auditoría:** `created_at`, `updated_at`, `usuario_id`
- **Migraciones:** se ejecutan en orden, nunca se modifican después de aplicadas

---

## Arquitectura de la aplicación

### Módulos del frontend

| Módulo | Ruta base | Pantallas |
|---|---|---|
| Dashboard | `/dashboard` | Ocupación, llegadas, salidas, caja del turno, ventas del día, alertas |
| Alojamiento | `/alojamiento` | Reservas, disponibilidad, tablero, check-in, huéspedes, folios, check-out |
| Bar y servicios | `/bar` | Venta, productos, inventario, compras, traslados, créditos de empleados |
| Caja | `/caja` | Turno, movimientos, cambio de turno, traslados, cierre |
| Reportes | `/reportes` | Ingresos, ocupación, libro, desayunos, cartera, cuadre |
| Configuración | `/configuracion` | Usuarios, roles, tarifas, temporadas, centros |

La navegación es por módulos, no por pantallas sueltas. El sidebar mantiene el
diseño de `design-system.md`: 240 px, fondo `navy-dark`, texto `cream`; topbar de
64 px con usuario y rol.

### Pantallas por módulo

**Dashboard**
- Tarjetas: habitaciones ocupadas, llegadas de hoy, salidas de hoy, efectivo
  esperado, ventas del día.
- Alertas: caja cerrada, habitaciones sucias, stock bajo, folios con saldo.

**Alojamiento**
- `/alojamiento/reservas`: lista y formulario de reserva.
- `/alojamiento/tablero`: estado visual de las 31 habitaciones.
- `/alojamiento/checkin`: check-in de reserva o walk-in.
- `/alojamiento/huespedes`: folios abiertos y huéspedes en casa.
- `/alojamiento/folios/:id`: detalle, cargos, pagos y check-out.

**Bar y servicios**
- `/bar/venta`: catálogo, carrito y cobro.
- `/bar/productos`: alta y edición de productos.
- `/bar/inventario`: existencias por almacén y traslados.
- `/bar/compras`: compra a proveedor y entrada de inventario.
- `/bar/creditos`: consumo y abono de empleados.

**Caja**
- `/caja/turno`: sesión actual, movimientos y cierre.
- `/caja/movimientos`: gastos, retiros, aportes y ajustes.
- `/caja/cambio-turno`: conteo, entrega y recibo del turno.
- `/caja/traslados`: efectivo entre cajas.

**Reportes**
- Ingresos, ocupación, libro, desayunos, cartera y cuadre.

### Estado de implementación

| Módulo | Estado | Qué falta |
|---|---|---|
| Autenticación y usuarios | Hecho | Auditoría de cambios |
| Habitaciones y tarifas | Hecho | Edición visual de temporadas |
| Disponibilidad y cotización | Hecho | — |
| Check-in, folio y check-out | Hecho | Contrato y multi-habitación |
| Cargos manuales | Hecho | — |
| Caja central | Hecho | — |
| Contabilidad | Parcial | Cuenta socio, cierre y estados |
| Reportes | Parcial | Cartera, resultado y cuadre PDF |
| Bar recepción | Parcial | Almacenes, compras, traslados y crédito |
| Reservas | Parcial | Crear, listar, editar fechas, cancelar y check-in; faltan anticipo y tablero |
| Dashboard y navegación por módulos | Parcial | Menú agrupado; faltan dashboard y rutas anidadas |
| Restaurante, eventos, DIAN | Fuera de la fase | Fases 1C, 2 y 3 |

### Esquema implementado

La implementación consolidó el esquema en estas migraciones:

| Migración | Contenido |
|---|---|
| `001_init.sql` | Configuración, roles, usuarios y migraciones |
| `002_habitaciones_tarifas.sql` | Temporadas, habitaciones y tarifas |
| `003_reservas.sql` | Acomodaciones, clientes, reservas y reserva_habitación |
| `004_checkin.sql` | Centros, huéspedes, folios, cargos, cobros y desayuno |
| `005_caja.sql` | Puntos de venta, sesiones y movimientos de caja |
| `006_contabilidad.sql` | Cuentas, asientos, líneas y libro |
| `007_cargo_cortesia.sql` | Motivo de cortesía |
| `008_bar.sql` | Productos, inventario, ventas de bar y detalle |
| `009_caja_avanzada.sql` | Autorización y soporte de movimientos |

El diseño de las migraciones 001–025 sigue siendo el objetivo funcional. Cuando
una tabla implementada se simplifica, la diferencia se registra en este documento
y en `tasks.md`; no se crea una tabla por fuera del diseño sin actualizarlo.

---

## Fase 0 / 1A — Núcleo financiero

### Migración 001 — Extensiones y configuración

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE configuracion (
  clave      VARCHAR(80) PRIMARY KEY,
  valor      TEXT NOT NULL,
  tipo       VARCHAR(20) DEFAULT 'STRING',
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### Migración 002 — Usuarios, roles y permisos

```sql
CREATE TABLE usuario (
  id              BIGSERIAL PRIMARY KEY,
  username        VARCHAR(60) UNIQUE NOT NULL,
  nombre_completo VARCHAR(150) NOT NULL,
  email           VARCHAR(150),
  password_hash   TEXT NOT NULL,
  activo          BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE rol (
  id     BIGSERIAL PRIMARY KEY,
  codigo VARCHAR(40) UNIQUE NOT NULL,
  nombre VARCHAR(80) NOT NULL
);

CREATE TABLE usuario_rol (
  usuario_id BIGINT REFERENCES usuario(id) ON DELETE CASCADE,
  rol_id     BIGINT REFERENCES rol(id) ON DELETE CASCADE,
  PRIMARY KEY (usuario_id, rol_id)
);

CREATE TABLE permiso (
  id     BIGSERIAL PRIMARY KEY,
  codigo VARCHAR(80) UNIQUE NOT NULL,
  nombre VARCHAR(150) NOT NULL
);

CREATE TABLE rol_permiso (
  rol_id     BIGINT REFERENCES rol(id) ON DELETE CASCADE,
  permiso_id BIGINT REFERENCES permiso(id) ON DELETE CASCADE,
  PRIMARY KEY (rol_id, permiso_id)
);
```

### Migración 003 — Centros y plan de cuentas

```sql
CREATE TABLE centro (
  id     BIGSERIAL PRIMARY KEY,
  codigo VARCHAR(40) UNIQUE NOT NULL,
  nombre VARCHAR(120) NOT NULL,
  tipo   VARCHAR(20) NOT NULL CHECK (tipo IN ('INGRESO','COSTE')),
  activo BOOLEAN DEFAULT true
);

CREATE TABLE cuenta (
  id              BIGSERIAL PRIMARY KEY,
  codigo          VARCHAR(20) UNIQUE NOT NULL,
  nombre          VARCHAR(150) NOT NULL,
  tipo            VARCHAR(20) NOT NULL
    CHECK (tipo IN ('ACTIVO','PASIVO','PATRIMONIO','INGRESO','COSTO','GASTO')),
  cuenta_padre_id BIGINT REFERENCES cuenta(id),
  activo          BOOLEAN DEFAULT true
);
```

### Migración 004 — Clientes

```sql
CREATE TABLE cliente (
  id                BIGSERIAL PRIMARY KEY,
  tipo              VARCHAR(20) NOT NULL
    CHECK (tipo IN ('PARTICULAR','EMPRESA','EMPLEADO','GRUPO_TRABAJO','SOCIO')),
  razon_social      VARCHAR(200) NOT NULL,
  nombre_comercial  VARCHAR(200),
  tipo_documento    VARCHAR(10),
  numero_documento  VARCHAR(30),
  email             VARCHAR(150),
  telefono          VARCHAR(40),
  direccion         VARCHAR(250),
  cupo_credito      NUMERIC(14,2) DEFAULT 0,
  dias_credito      INT DEFAULT 0,
  activo            BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_cliente_doc ON cliente(tipo_documento, numero_documento);
CREATE INDEX idx_cliente_razon ON cliente(razon_social);
```

### Migración 005 — Cajas, POS, sesiones y movimientos de caja

```sql
CREATE TABLE caja_fisica (
  id        BIGSERIAL PRIMARY KEY,
  nombre    VARCHAR(80) NOT NULL,
  ubicacion VARCHAR(120),
  activo    BOOLEAN DEFAULT true
);

CREATE TABLE punto_venta (
  id            BIGSERIAL PRIMARY KEY,
  codigo        VARCHAR(40) UNIQUE NOT NULL,
  nombre        VARCHAR(120) NOT NULL,
  centro_id     BIGINT NOT NULL REFERENCES centro(id),
  caja_fisica_id BIGINT REFERENCES caja_fisica(id),
  capacidades   JSONB NOT NULL DEFAULT '{}'::jsonb,
  activo        BOOLEAN DEFAULT true
);

CREATE TABLE sesion_caja (
  id                     BIGSERIAL PRIMARY KEY,
  punto_venta_id         BIGINT NOT NULL REFERENCES punto_venta(id),
  caja_fisica_id         BIGINT NOT NULL REFERENCES caja_fisica(id),
  usuario_apertura_id    BIGINT NOT NULL REFERENCES usuario(id),
  usuario_cierre_id      BIGINT REFERENCES usuario(id),
  fecha_apertura         TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_cierre           TIMESTAMPTZ,
  monto_apertura         NUMERIC(14,2) NOT NULL DEFAULT 0,
  monto_sistema_efectivo NUMERIC(14,2),
  monto_declarado        NUMERIC(14,2),
  diferencia             NUMERIC(14,2),
  estado                 VARCHAR(20) NOT NULL DEFAULT 'ABIERTA'
    CHECK (estado IN ('ABIERTA','CERRADA')),
  notas                  TEXT,
  created_at             TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX uq_sesion_abierta
  ON sesion_caja(punto_venta_id)
  WHERE estado = 'ABIERTA';

CREATE INDEX idx_sesion_fecha ON sesion_caja(fecha_apertura, fecha_cierre);

CREATE TABLE movimiento_caja (
  id                    BIGSERIAL PRIMARY KEY,
  sesion_caja_id        BIGINT NOT NULL REFERENCES sesion_caja(id),
  tipo                  VARCHAR(30) NOT NULL CHECK (tipo IN
    ('APERTURA','VENTA_EFECTIVO','GASTO_EFECTIVO','RETIRO','INGRESO','AJUSTE',
     'APORTE_PAGO','RETIRO_DUENO','AJUSTE_FALTANTE','AJUSTE_SOBRANTE',
     'TRASLADO_SALIDA','TRASLADO_ENTRADA')),
  monto                 NUMERIC(14,2) NOT NULL,
  referencia_tipo       VARCHAR(30),
  referencia_id         BIGINT,
  responsable_id        BIGINT REFERENCES usuario(id),
  autorizado_por_id     BIGINT REFERENCES usuario(id),
  documento_adjunto_id  BIGINT,
  contraparte_sesion_id BIGINT REFERENCES sesion_caja(id),
  usuario_id            BIGINT NOT NULL REFERENCES usuario(id),
  fecha                 TIMESTAMPTZ NOT NULL DEFAULT now(),
  notas                 TEXT
);

CREATE INDEX idx_mov_caja_sesion ON movimiento_caja(sesion_caja_id);
```

### Migración 006 — Libro de movimientos (doble partida)

```sql
CREATE TABLE libro_movimiento (
  id           BIGSERIAL PRIMARY KEY,
  fecha        TIMESTAMPTZ NOT NULL DEFAULT now(),
  centro_id    BIGINT REFERENCES centro(id),
  cuenta_id    BIGINT NOT NULL REFERENCES cuenta(id),
  debe         NUMERIC(14,2) NOT NULL DEFAULT 0,
  haber        NUMERIC(14,2) NOT NULL DEFAULT 0,
  origen_tipo  VARCHAR(30) NOT NULL,
  origen_id    BIGINT,
  descripcion  TEXT,
  usuario_id   BIGINT REFERENCES usuario(id),
  created_at   TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT chk_debe_haber CHECK ((debe = 0) <> (haber = 0))
);

CREATE INDEX idx_libro_fecha ON libro_movimiento(fecha);
CREATE INDEX idx_libro_centro_fecha ON libro_movimiento(centro_id, fecha);
CREATE INDEX idx_libro_cuenta_fecha ON libro_movimiento(cuenta_id, fecha);
CREATE INDEX idx_libro_origen ON libro_movimiento(origen_tipo, origen_id);
```

### Migración 007 — Cuenta socio

```sql
CREATE TABLE cuenta_socio (
  id                 BIGSERIAL PRIMARY KEY,
  cliente_id         BIGINT REFERENCES cliente(id),
  tipo               VARCHAR(20) CHECK (tipo IN ('APORTE','RETIRO')),
  monto              NUMERIC(14,2) NOT NULL,
  saldo_acumulado    NUMERIC(14,2),
  fecha              TIMESTAMPTZ DEFAULT now(),
  descripcion        TEXT,
  movimiento_caja_id BIGINT REFERENCES movimiento_caja(id)
);
```

### Migración 008 — Documentos adjuntos

```sql
CREATE TABLE documento_adjunto (
  id               BIGSERIAL PRIMARY KEY,
  nombre           VARCHAR(200),
  tipo_mime        VARCHAR(80),
  url              TEXT NOT NULL,
  tamano_bytes     BIGINT,
  subido_por_id    BIGINT REFERENCES usuario(id),
  fecha            TIMESTAMPTZ DEFAULT now(),
  referencia_tipo  VARCHAR(40),
  referencia_id    BIGINT
);

CREATE INDEX idx_adjunto_referencia ON documento_adjunto(referencia_tipo, referencia_id);
```

---

## Fase 1A — Alojamiento

### Migración 009 — Habitaciones y tarifas

```sql
CREATE TABLE tipo_habitacion (
  id             BIGSERIAL PRIMARY KEY,
  nombre         VARCHAR(80) NOT NULL,
  capacidad_max  INT NOT NULL DEFAULT 2,
  descripcion    TEXT
);

CREATE TABLE habitacion (
  id                 BIGSERIAL PRIMARY KEY,
  numero             VARCHAR(20) UNIQUE NOT NULL,
  tipo_habitacion_id BIGINT NOT NULL REFERENCES tipo_habitacion(id),
  piso               INT,
  estado             VARCHAR(20) NOT NULL DEFAULT 'DISPONIBLE'
    CHECK (estado IN ('DISPONIBLE','OCUPADA','MANTENIMIENTO','LIMPIEZA')),
  activo             BOOLEAN DEFAULT true
);

CREATE TABLE tarifa (
  id                 BIGSERIAL PRIMARY KEY,
  tipo_habitacion_id BIGINT NOT NULL REFERENCES tipo_habitacion(id),
  modalidad          VARCHAR(10) NOT NULL
    CHECK (modalidad IN ('NOCHE','MENSUAL','HORA','DIA')),
  vigencia_desde     DATE NOT NULL,
  vigencia_hasta     DATE,
  valor              NUMERIC(14,2) NOT NULL
);
```

### Migración 010 — Reservas, huéspedes y habitaciones reservadas

```sql
CREATE TABLE reserva (
  id                   BIGSERIAL PRIMARY KEY,
  codigo               VARCHAR(20) UNIQUE NOT NULL,
  titular_cliente_id   BIGINT NOT NULL REFERENCES cliente(id),
  pagador_cliente_id   BIGINT REFERENCES cliente(id),
  fecha_entrada        DATE NOT NULL,
  fecha_salida         DATE NOT NULL,
  modalidad            VARCHAR(10) NOT NULL
    CHECK (modalidad IN ('NOCHE','MENSUAL','HORA','DIA')),
  estado               VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
    CHECK (estado IN ('PENDIENTE','CONFIRMADA','CHECKIN','CHECKOUT','CANCELADA','NO_SHOW')),
  monto_abono          NUMERIC(14,2) DEFAULT 0,
  politica_cancelacion VARCHAR(40),
  canal                VARCHAR(30),
  notas                TEXT,
  created_at           TIMESTAMPTZ DEFAULT now(),
  CHECK (fecha_salida > fecha_entrada)
);

CREATE TABLE reserva_habitacion (
  id                             BIGSERIAL PRIMARY KEY,
  reserva_id                     BIGINT NOT NULL REFERENCES reserva(id) ON DELETE CASCADE,
  habitacion_id                  BIGINT NOT NULL REFERENCES habitacion(id),
  tarifa                         NUMERIC(14,2) NOT NULL,
  fecha_entrada                  DATE NOT NULL,
  fecha_salida                   DATE NOT NULL,
  estado                         VARCHAR(20) NOT NULL DEFAULT 'ACTIVA'
    CHECK (estado IN ('ACTIVA','CHECKIN','CHECKOUT','CANCELADA')),
  num_huespedes                  INT DEFAULT 1,
  tarifa_por_huesped_extra       NUMERIC(14,2) DEFAULT 0,
  hora_entrada_pactada           TIME DEFAULT '15:00',
  hora_salida_pactada            TIME DEFAULT '13:00',
  hora_entrada_real              TIMESTAMPTZ,
  hora_salida_real               TIMESTAMPTZ,
  es_early_checkin               BOOLEAN DEFAULT false,
  es_late_checkout               BOOLEAN DEFAULT false,
  cargo_early_late               NUMERIC(14,2) DEFAULT 0,
  es_extension                   BOOLEAN DEFAULT false,
  reserva_habitacion_original_id BIGINT REFERENCES reserva_habitacion(id),
  motivo_cambio                  VARCHAR(100)
);

CREATE INDEX idx_res_hab_habitacion
  ON reserva_habitacion(habitacion_id, fecha_entrada, fecha_salida);

CREATE TABLE huesped (
  id                    BIGSERIAL PRIMARY KEY,
  reserva_habitacion_id BIGINT NOT NULL REFERENCES reserva_habitacion(id) ON DELETE CASCADE,
  cliente_id            BIGINT REFERENCES cliente(id),
  nombre_completo       VARCHAR(200) NOT NULL,
  tipo_documento        VARCHAR(10),
  numero_documento      VARCHAR(30),
  telefono              VARCHAR(40),
  email                 VARCHAR(150),
  empresa_cliente_id    BIGINT REFERENCES cliente(id),
  es_titular            BOOLEAN DEFAULT false,
  checkin_ts            TIMESTAMPTZ,
  checkout_ts           TIMESTAMPTZ
);
```

### Migración 011 — Folios y cargos

```sql
CREATE TABLE folio (
  id                     BIGSERIAL PRIMARY KEY,
  reserva_id             BIGINT NOT NULL REFERENCES reserva(id),
  reserva_habitacion_id  BIGINT REFERENCES reserva_habitacion(id),
  tipo                   VARCHAR(20) NOT NULL
    CHECK (tipo IN ('MAESTRO','HABITACION','INDIVIDUAL')),
  responsable_cliente_id BIGINT REFERENCES cliente(id),
  padre_id               BIGINT REFERENCES folio(id),
  estado                 VARCHAR(20) NOT NULL DEFAULT 'ABIERTO'
    CHECK (estado IN ('ABIERTO','CERRADO','FACTURADO','ANULADO')),
  fecha_apertura         TIMESTAMPTZ DEFAULT now(),
  fecha_cierre           TIMESTAMPTZ,
  saldo                  NUMERIC(14,2) NOT NULL DEFAULT 0
);

CREATE INDEX idx_folio_reserva ON folio(reserva_id);
CREATE INDEX idx_folio_responsable ON folio(responsable_cliente_id, estado);

CREATE TABLE folio_cargo (
  id                BIGSERIAL PRIMARY KEY,
  folio_id          BIGINT NOT NULL REFERENCES folio(id),
  fecha             TIMESTAMPTZ NOT NULL DEFAULT now(),
  concepto          VARCHAR(200) NOT NULL,
  centro_id         BIGINT NOT NULL REFERENCES centro(id),
  cantidad          NUMERIC(14,4) NOT NULL DEFAULT 1,
  precio_unitario   NUMERIC(14,2) NOT NULL,
  monto             NUMERIC(14,2) NOT NULL,
  es_cortesia       BOOLEAN DEFAULT false,
  autorizado_por_id BIGINT REFERENCES usuario(id),
  motivo_cortesia   TEXT,
  origen_tipo       VARCHAR(30),
  origen_id         BIGINT,
  usuario_id        BIGINT REFERENCES usuario(id),
  anulado           BOOLEAN DEFAULT false
);

CREATE INDEX idx_folio_cargo_folio ON folio_cargo(folio_id);
```

### Migración 012 — Cobros y cuentas por cobrar

```sql
CREATE TABLE cobro (
  id               BIGSERIAL PRIMARY KEY,
  folio_id         BIGINT REFERENCES folio(id),
  venta_id         BIGINT,
  tipo_documento   VARCHAR(25) NOT NULL
    CHECK (tipo_documento IN ('NINGUNO','RECIBO_CAJA','FACTURA_ELECTRONICA')),
  numero_documento VARCHAR(40),
  cliente_id       BIGINT REFERENCES cliente(id),
  monto            NUMERIC(14,2) NOT NULL CHECK (monto > 0),
  metodo_pago      VARCHAR(20) NOT NULL
    CHECK (metodo_pago IN ('EFECTIVO','TARJETA','TRANSFERENCIA','CREDITO')),
  cuenta_destino   VARCHAR(20) DEFAULT 'HOTEL'
    CHECK (cuenta_destino IN ('HOTEL','DUENO')),
  sesion_caja_id   BIGINT REFERENCES sesion_caja(id),
  tipo_cobro       VARCHAR(30) DEFAULT 'COBRO_FOLIO'
    CHECK (tipo_cobro IN ('COBRO_FOLIO','ANTICIPO_RESERVA','ABONO_CXC','ANTICIPO_EVENTO')),
  es_anticipo      BOOLEAN DEFAULT false,
  aplicado         BOOLEAN DEFAULT false,
  fecha            TIMESTAMPTZ NOT NULL DEFAULT now(),
  usuario_id       BIGINT NOT NULL REFERENCES usuario(id),
  estado           VARCHAR(20) NOT NULL DEFAULT 'ACTIVO'
    CHECK (estado IN ('ACTIVO','ANULADO')),
  notas            TEXT,
  CONSTRAINT chk_cobro_factura CHECK (
    tipo_documento <> 'FACTURA_ELECTRONICA' OR cliente_id IS NOT NULL
  ),
  CONSTRAINT chk_cobro_efectivo CHECK (
    metodo_pago <> 'EFECTIVO' OR sesion_caja_id IS NOT NULL
  )
);

CREATE TABLE cuenta_cobrar (
  id                BIGSERIAL PRIMARY KEY,
  cliente_id        BIGINT NOT NULL REFERENCES cliente(id),
  folio_id          BIGINT REFERENCES folio(id),
  cobro_id          BIGINT REFERENCES cobro(id),
  monto_original    NUMERIC(14,2) NOT NULL,
  saldo             NUMERIC(14,2) NOT NULL,
  fecha_emision     DATE NOT NULL,
  fecha_vencimiento DATE,
  estado            VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
    CHECK (estado IN ('PENDIENTE','PARCIAL','PAGADA','VENCIDA','ANULADA')),
  notas             TEXT
);

CREATE INDEX idx_cxc_cliente ON cuenta_cobrar(cliente_id, estado);
CREATE INDEX idx_cxc_vence ON cuenta_cobrar(fecha_vencimiento)
  WHERE estado IN ('PENDIENTE','PARCIAL');

CREATE TABLE cuenta_cobrar_pago (
  id                BIGSERIAL PRIMARY KEY,
  cuenta_cobrar_id  BIGINT NOT NULL REFERENCES cuenta_cobrar(id),
  cobro_id          BIGINT NOT NULL REFERENCES cobro(id),
  monto             NUMERIC(14,2) NOT NULL,
  fecha             TIMESTAMPTZ DEFAULT now(),
  notas             TEXT
);
```

---

## Fase 1B — Reglas de negocio del alojamiento

### Migración 013 — Contratos

```sql
CREATE TABLE contrato (
  id                   BIGSERIAL PRIMARY KEY,
  cliente_id           BIGINT NOT NULL REFERENCES cliente(id),
  reserva_id           BIGINT REFERENCES reserva(id),
  tipo                 VARCHAR(20) CHECK (tipo IN ('HOSPEDAJE','MENSUAL')),
  fecha_inicio         DATE,
  fecha_fin            DATE,
  monto_mensual        NUMERIC(14,2),
  dia_pago             INT,
  documento_adjunto_id BIGINT REFERENCES documento_adjunto(id),
  estado               VARCHAR(20) CHECK (estado IN ('BORRADOR','FIRMADO','ACTIVO','FINALIZADO')),
  created_at           TIMESTAMPTZ DEFAULT now()
);
```

### Migración 014 — Reglas de descuento

```sql
CREATE TABLE regla_descuento (
  id                    BIGSERIAL PRIMARY KEY,
  nombre                VARCHAR(100),
  centro_id             BIGINT REFERENCES centro(id),
  tipo                  VARCHAR(30),
  condicion             JSONB,
  porcentaje            NUMERIC(5,2),
  monto_fijo            NUMERIC(14,2),
  vigencia_desde        DATE,
  vigencia_hasta        DATE,
  requiere_autorizacion BOOLEAN DEFAULT false,
  activo                BOOLEAN DEFAULT true
);

CREATE TABLE descuento_aplicado (
  id                BIGSERIAL PRIMARY KEY,
  regla_id          BIGINT REFERENCES regla_descuento(id),
  folio_id          BIGINT REFERENCES folio(id),
  folio_cargo_id    BIGINT REFERENCES folio_cargo(id),
  monto_descuento   NUMERIC(14,2),
  autorizado_por_id BIGINT REFERENCES usuario(id),
  fecha             TIMESTAMPTZ DEFAULT now()
);
```

---

## Fase 1C — Operación ampliada

### Migración 015 — Averías, limpieza y turnos

```sql
CREATE TABLE averia_habitacion (
  id                BIGSERIAL PRIMARY KEY,
  habitacion_id     BIGINT NOT NULL REFERENCES habitacion(id),
  descripcion       TEXT NOT NULL,
  prioridad         VARCHAR(10) CHECK (prioridad IN ('BAJA','MEDIA','ALTA')),
  estado            VARCHAR(20) CHECK (estado IN ('REPORTADA','EN_REPARACION','REPARADA','CANCELADA')),
  reportado_por_id  BIGINT REFERENCES usuario(id),
  fecha_reporte     TIMESTAMPTZ DEFAULT now(),
  fecha_reparacion  TIMESTAMPTZ,
  costo             NUMERIC(14,2),
  notas             TEXT
);

CREATE TABLE limpieza_habitacion (
  id             BIGSERIAL PRIMARY KEY,
  habitacion_id  BIGINT NOT NULL REFERENCES habitacion(id),
  camarera_id    BIGINT REFERENCES usuario(id),
  fecha          TIMESTAMPTZ DEFAULT now(),
  tipo           VARCHAR(20) CHECK (tipo IN ('SALIDA','MANTENIMIENTO','PROFUNDA')),
  observaciones  TEXT
);

CREATE TABLE turno_personal (
  id            BIGSERIAL PRIMARY KEY,
  usuario_id    BIGINT NOT NULL REFERENCES usuario(id),
  fecha         DATE NOT NULL,
  hora_inicio   TIMESTAMPTZ,
  hora_fin      TIMESTAMPTZ,
  rol_en_turno  VARCHAR(40),
  notas         TEXT
);
```

### Migración 016 — Activos fijos (inventario de mobiliario)

```sql
CREATE TABLE activo_fijo (
  id                BIGSERIAL PRIMARY KEY,
  codigo_etiqueta   VARCHAR(50) UNIQUE,
  nombre            VARCHAR(150) NOT NULL,
  categoria         VARCHAR(60),
  habitacion_id     BIGINT REFERENCES habitacion(id),
  ubicacion_libre   VARCHAR(120),
  estado            VARCHAR(30) DEFAULT 'BUENO'
    CHECK (estado IN ('BUENO','REGULAR','MALO','BAJA','REPARACION')),
  fecha_compra      DATE,
  valor_compra      NUMERIC(14,2),
  observaciones     TEXT,
  activo            BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE movimiento_activo (
  id                   BIGSERIAL PRIMARY KEY,
  activo_id            BIGINT NOT NULL REFERENCES activo_fijo(id),
  tipo                 VARCHAR(30) CHECK (tipo IN
    ('TRASLADO','CAMBIO_ESTADO','BAJA','REINGRESO','REPARACION')),
  habitacion_origen_id BIGINT REFERENCES habitacion(id),
  habitacion_destino_id BIGINT REFERENCES habitacion(id),
  ubicacion_origen     VARCHAR(120),
  ubicacion_destino    VARCHAR(120),
  motivo               TEXT,
  usuario_id           BIGINT REFERENCES usuario(id),
  fecha                TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE verificacion_activo (
  id                  BIGSERIAL PRIMARY KEY,
  activo_id           BIGINT NOT NULL REFERENCES activo_fijo(id),
  fecha_verificacion  TIMESTAMPTZ,
  estado_encontrado   VARCHAR(30),
  usuario_id          BIGINT REFERENCES usuario(id),
  observaciones       TEXT
);
```

### Migración 017 — Productos, almacenes e inventario

```sql
CREATE TABLE categoria_producto (
  id        BIGSERIAL PRIMARY KEY,
  nombre    VARCHAR(80) NOT NULL,
  centro_id BIGINT REFERENCES centro(id)
);

CREATE TABLE producto (
  id                  BIGSERIAL PRIMARY KEY,
  codigo              VARCHAR(40) UNIQUE,
  nombre              VARCHAR(150) NOT NULL,
  categoria_id        BIGINT REFERENCES categoria_producto(id),
  centro_id           BIGINT NOT NULL REFERENCES centro(id),
  unidad              VARCHAR(20) DEFAULT 'UND',
  precio_venta        NUMERIC(14,2) NOT NULL,
  controla_inventario BOOLEAN DEFAULT true,
  activo              BOOLEAN DEFAULT true
);

CREATE TABLE almacen (
  id             BIGSERIAL PRIMARY KEY,
  punto_venta_id BIGINT NOT NULL REFERENCES punto_venta(id),
  nombre         VARCHAR(80) NOT NULL,
  activo         BOOLEAN DEFAULT true
);

CREATE TABLE inventario (
  id               BIGSERIAL PRIMARY KEY,
  almacen_id       BIGINT NOT NULL REFERENCES almacen(id),
  producto_id      BIGINT NOT NULL REFERENCES producto(id),
  cantidad_actual  NUMERIC(14,4) NOT NULL DEFAULT 0,
  costo_promedio   NUMERIC(14,4) NOT NULL DEFAULT 0,
  UNIQUE (almacen_id, producto_id)
);

CREATE TABLE movimiento_inventario (
  id               BIGSERIAL PRIMARY KEY,
  inventario_id    BIGINT NOT NULL REFERENCES inventario(id),
  tipo             VARCHAR(30) NOT NULL CHECK (tipo IN
    ('ENTRADA','SALIDA','AJUSTE','TRASLADO','MERMA','CONSUMO_EMPLEADO')),
  cantidad         NUMERIC(14,4) NOT NULL,
  costo_unitario   NUMERIC(14,4),
  motivo           VARCHAR(100),
  referencia_tipo  VARCHAR(30),
  referencia_id    BIGINT,
  fecha            TIMESTAMPTZ DEFAULT now(),
  usuario_id       BIGINT REFERENCES usuario(id)
);

CREATE INDEX idx_mov_inv_inventario ON movimiento_inventario(inventario_id, fecha);
```

### Migración 018 — Ventas

```sql
CREATE TABLE venta (
  id               BIGSERIAL PRIMARY KEY,
  punto_venta_id   BIGINT NOT NULL REFERENCES punto_venta(id),
  centro_id        BIGINT NOT NULL REFERENCES centro(id),
  sesion_caja_id   BIGINT REFERENCES sesion_caja(id),
  cliente_id       BIGINT REFERENCES cliente(id),
  tipo_cliente     VARCHAR(25) NOT NULL DEFAULT 'CONSUMIDOR_FINAL'
    CHECK (tipo_cliente IN ('CONSUMIDOR_FINAL','EXTERNO_IDENTIFICADO','HUESPED','EMPRESA')),
  folio_id         BIGINT REFERENCES folio(id),
  requiere_factura BOOLEAN DEFAULT false,
  subtotal         NUMERIC(14,2) NOT NULL,
  impuestos        NUMERIC(14,2) DEFAULT 0,
  total            NUMERIC(14,2) NOT NULL,
  estado           VARCHAR(20) NOT NULL DEFAULT 'PAGADA'
    CHECK (estado IN ('ABIERTA','PAGADA','ANULADA')),
  idempotency_key  UUID UNIQUE,
  fecha            TIMESTAMPTZ NOT NULL DEFAULT now(),
  usuario_id       BIGINT NOT NULL REFERENCES usuario(id)
);

CREATE INDEX idx_venta_fecha ON venta(fecha);
CREATE INDEX idx_venta_centro ON venta(centro_id, fecha);

CREATE TABLE detalle_venta (
  id              BIGSERIAL PRIMARY KEY,
  venta_id        BIGINT NOT NULL REFERENCES venta(id) ON DELETE CASCADE,
  producto_id     BIGINT NOT NULL REFERENCES producto(id),
  cantidad        NUMERIC(14,4) NOT NULL,
  precio_unitario NUMERIC(14,2) NOT NULL,
  costo_unitario  NUMERIC(14,4) DEFAULT 0,
  total           NUMERIC(14,2) NOT NULL
);

ALTER TABLE cobro ADD CONSTRAINT fk_cobro_venta
  FOREIGN KEY (venta_id) REFERENCES venta(id);
```

### Migración 019 — Proveedores, compras y gastos

```sql
CREATE TABLE proveedor (
  id           BIGSERIAL PRIMARY KEY,
  razon_social VARCHAR(200) NOT NULL,
  nit          VARCHAR(30),
  telefono     VARCHAR(40),
  email        VARCHAR(150),
  activo       BOOLEAN DEFAULT true
);

CREATE TABLE compra (
  id                   BIGSERIAL PRIMARY KEY,
  proveedor_id         BIGINT REFERENCES proveedor(id),
  almacen_id           BIGINT NOT NULL REFERENCES almacen(id),
  fecha                DATE NOT NULL,
  total                NUMERIC(14,2) NOT NULL,
  estado               VARCHAR(20) DEFAULT 'PENDIENTE'
    CHECK (estado IN ('PENDIENTE','RECIBIDA','PAGADA','ANULADA')),
  factura_proveedor    VARCHAR(60),
  sin_factura          BOOLEAN DEFAULT false,
  nombre_proveedor_libre VARCHAR(200),
  pagado_desde_caja    BOOLEAN DEFAULT false,
  sesion_caja_id       BIGINT REFERENCES sesion_caja(id),
  documento_adjunto_id BIGINT REFERENCES documento_adjunto(id),
  usuario_id           BIGINT REFERENCES usuario(id),
  notas                TEXT
);

CREATE TABLE detalle_compra (
  id             BIGSERIAL PRIMARY KEY,
  compra_id      BIGINT NOT NULL REFERENCES compra(id) ON DELETE CASCADE,
  producto_id    BIGINT NOT NULL REFERENCES producto(id),
  cantidad       NUMERIC(14,4) NOT NULL,
  costo_unitario NUMERIC(14,4) NOT NULL,
  total          NUMERIC(14,2) NOT NULL
);

CREATE TABLE gasto (
  id                   BIGSERIAL PRIMARY KEY,
  centro_id            BIGINT REFERENCES centro(id),
  categoria            VARCHAR(60) NOT NULL,
  descripcion          VARCHAR(300),
  monto                NUMERIC(14,2) NOT NULL,
  fecha                DATE NOT NULL,
  proveedor_id         BIGINT REFERENCES proveedor(id),
  tipo                 VARCHAR(10) DEFAULT 'DIRECTO'
    CHECK (tipo IN ('DIRECTO','INDIRECTO')),
  comprobante          VARCHAR(100),
  pagado_por           VARCHAR(20) DEFAULT 'CAJA'
    CHECK (pagado_por IN ('CAJA','DUENO','TERCERO','TRANSFERENCIA')),
  cuenta_socio_id      BIGINT REFERENCES cuenta_socio(id),
  documento_adjunto_id BIGINT REFERENCES documento_adjunto(id),
  usuario_id           BIGINT REFERENCES usuario(id),
  created_at           TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_gasto_centro_fecha ON gasto(centro_id, fecha);
```

---

## Fase 2 — POS completo y eventos

### Migración 020 — Mesas y comandas

```sql
CREATE TABLE mesa (
  id             BIGSERIAL PRIMARY KEY,
  punto_venta_id BIGINT NOT NULL REFERENCES punto_venta(id),
  numero         VARCHAR(20) NOT NULL,
  capacidad      INT DEFAULT 4,
  estado         VARCHAR(20) DEFAULT 'LIBRE'
    CHECK (estado IN ('LIBRE','OCUPADA','RESERVADA','POR_LIMPIAR'))
);

CREATE TABLE comanda (
  id               BIGSERIAL PRIMARY KEY,
  venta_id         BIGINT NOT NULL REFERENCES venta(id),
  mesa_id          BIGINT REFERENCES mesa(id),
  estado           VARCHAR(20) DEFAULT 'PENDIENTE'
    CHECK (estado IN ('PENDIENTE','EN_PREPARACION','LISTA','ENTREGADA')),
  nota_papel       VARCHAR(200),
  entregada_por_id BIGINT REFERENCES usuario(id),
  fecha            TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE venta ADD COLUMN mesa_id BIGINT REFERENCES mesa(id);
ALTER TABLE venta ADD COLUMN tipo_servicio VARCHAR(20)
  CHECK (tipo_servicio IN ('MESA','LLEVAR','HABITACION','BARRA'));
ALTER TABLE venta ADD COLUMN venta_padre_id BIGINT REFERENCES venta(id);
```

### Migración 021 — Eventos y recursos reservables

```sql
CREATE TABLE recurso_reservable (
  id            BIGSERIAL PRIMARY KEY,
  codigo        VARCHAR(40) UNIQUE NOT NULL,
  nombre        VARCHAR(80) NOT NULL,
  capacidad_max INT,
  activo        BOOLEAN DEFAULT true
);

CREATE TABLE evento (
  id                      BIGSERIAL PRIMARY KEY,
  cliente_id              BIGINT NOT NULL REFERENCES cliente(id),
  fecha_inicio            TIMESTAMPTZ NOT NULL,
  fecha_fin               TIMESTAMPTZ NOT NULL,
  num_personas            INT NOT NULL,
  tarifa_total            NUMERIC(14,2) NOT NULL,
  centro_id               BIGINT NOT NULL REFERENCES centro(id),
  porcentaje_anticipo     NUMERIC(5,2),
  monto_anticipo          NUMERIC(14,2),
  fecha_limite_devolucion TIMESTAMPTZ,
  politica_cancelacion    VARCHAR(40),
  anticipo_devuelto       BOOLEAN DEFAULT false,
  estado                  VARCHAR(20) DEFAULT 'COTIZADO'
    CHECK (estado IN ('COTIZADO','RESERVADO','EN_CURSO','FINALIZADO','CANCELADO')),
  notas                   TEXT,
  created_at              TIMESTAMPTZ DEFAULT now(),
  CHECK (fecha_fin > fecha_inicio)
);

CREATE TABLE evento_recurso (
  id         BIGSERIAL PRIMARY KEY,
  evento_id  BIGINT NOT NULL REFERENCES evento(id) ON DELETE CASCADE,
  recurso_id BIGINT NOT NULL REFERENCES recurso_reservable(id),
  rango      TSTZRANGE NOT NULL,
  EXCLUDE USING gist (recurso_id WITH =, rango WITH &&)
);
```

### Migración 022 — Paquetes turísticos

```sql
CREATE TABLE paquete (
  id           BIGSERIAL PRIMARY KEY,
  codigo       VARCHAR(40) UNIQUE,
  nombre       VARCHAR(150),
  descripcion  TEXT,
  precio_total NUMERIC(14,2),
  activo       BOOLEAN DEFAULT true
);

CREATE TABLE paquete_componente (
  id          BIGSERIAL PRIMARY KEY,
  paquete_id  BIGINT NOT NULL REFERENCES paquete(id) ON DELETE CASCADE,
  tipo        VARCHAR(30) CHECK (tipo IN
    ('HABITACION_HORAS','HABITACION_NOCHE','PISCINA','RESTAURANTE','TRANSPORTE','TOUR','OTRO')),
  descripcion VARCHAR(200),
  producto_id BIGINT REFERENCES producto(id),
  cantidad    INT DEFAULT 1,
  centro_id   BIGINT REFERENCES centro(id)
);
```

### Migración 023 — Facturación electrónica

```sql
CREATE TABLE resolucion_dian (
  id             BIGSERIAL PRIMARY KEY,
  numero         VARCHAR(40) NOT NULL,
  prefijo        VARCHAR(10),
  rango_desde    BIGINT NOT NULL,
  rango_hasta    BIGINT NOT NULL,
  vigencia_desde DATE,
  vigencia_hasta DATE,
  activa         BOOLEAN DEFAULT true
);

CREATE TABLE documento_electronico (
  id              BIGSERIAL PRIMARY KEY,
  cobro_id        BIGINT NOT NULL REFERENCES cobro(id),
  resolucion_id   BIGINT REFERENCES resolucion_dian(id),
  cufe            VARCHAR(100),
  numero_completo VARCHAR(40),
  xml_url         TEXT,
  pdf_url         TEXT,
  estado_dian     VARCHAR(30),
  respuesta_dian  JSONB,
  fecha_emision   TIMESTAMPTZ DEFAULT now()
);
```

### Migración 024 — Índices adicionales

```sql
CREATE INDEX idx_huesped_documento ON huesped(numero_documento);
CREATE INDEX idx_reserva_fechas ON reserva(fecha_entrada, fecha_salida);
```

### Migración 025 — Datos semilla

```sql
-- Centros
INSERT INTO centro (codigo, nombre, tipo) VALUES
  ('ALOJAMIENTO',     'Alojamiento',           'INGRESO'),
  ('BAR_RECEPCION',   'Bar Recepción',         'INGRESO'),
  ('BAR_TERRAZA',     'Bar Terraza',           'INGRESO'),
  ('RESTAURANTE',     'Restaurante',           'INGRESO'),
  ('EVENTOS',         'Eventos',               'INGRESO'),
  ('PISCINA_PASADIA', 'Piscina - Pasadías',    'INGRESO'),
  ('LAVANDERIA',      'Lavandería',            'COSTE'),
  ('TOUR_REPRESA',    'Tour Represa de Prado', 'INGRESO');

-- Plan de cuentas mínimo
INSERT INTO cuenta (codigo, nombre, tipo) VALUES
  ('1101', 'Caja',                         'ACTIVO'),
  ('1102', 'Bancos',                       'ACTIVO'),
  ('1103', 'Cuentas por cobrar',           'ACTIVO'),
  ('1104', 'Inventario',                   'ACTIVO'),
  ('2101', 'IVA por pagar',                'PASIVO'),
  ('2102', 'Cuentas por pagar proveedores','PASIVO'),
  ('3101', 'Patrimonio',                   'PATRIMONIO'),
  ('4101', 'Ingreso Alojamiento',          'INGRESO'),
  ('4102', 'Ingreso Bar Recepción',        'INGRESO'),
  ('4103', 'Ingreso Bar Terraza',          'INGRESO'),
  ('4104', 'Ingreso Restaurante',          'INGRESO'),
  ('4105', 'Ingreso Eventos',              'INGRESO'),
  ('4106', 'Ingreso Piscina Pasadía',      'INGRESO'),
  ('4107', 'Ingreso Tour Represa',         'INGRESO'),
  ('5101', 'Costo Bebidas',                'COSTO'),
  ('5102', 'Costo Alimentos',              'COSTO'),
  ('6101', 'Gasto Lavandería',             'GASTO'),
  ('6102', 'Gasto Servicios',              'GASTO'),
  ('6103', 'Gasto Nómina',                 'GASTO'),
  ('6104', 'Gasto Mantenimiento',          'GASTO'),
  ('6105', 'Gasto Administración',         'GASTO'),
  ('6106', 'Gasto Cortesías',              'GASTO');

-- Caja física central
INSERT INTO caja_fisica (nombre, ubicacion) VALUES
  ('Caja Central', 'Recepción');

-- Puntos de venta iniciales
INSERT INTO punto_venta (codigo, nombre, centro_id, caja_fisica_id, capacidades) VALUES
  ('RECEPCION', 'Recepción',
    (SELECT id FROM centro WHERE codigo='ALOJAMIENTO'), 1,
    '{"mesas":false,"cargo_folio":true,"venta_por_cantidad":false}'::jsonb),
  ('BAR_RECEP', 'Bar Recepción',
    (SELECT id FROM centro WHERE codigo='BAR_RECEPCION'), 1,
    '{"mesas":false,"cargo_folio":true,"venta_por_cantidad":false}'::jsonb),
  ('TAQUILLA_PISCINA', 'Taquilla Piscina',
    (SELECT id FROM centro WHERE codigo='PISCINA_PASADIA'), 1,
    '{"mesas":false,"cargo_folio":false,"venta_por_cantidad":true}'::jsonb);

-- Roles base
INSERT INTO rol (codigo, nombre) VALUES
  ('ADMIN',     'Administrador'),
  ('GERENTE',   'Gerente'),
  ('RECEPCION', 'Recepcionista'),
  ('CAJERO',    'Cajero');

-- Usuario admin (password: admin123 — CAMBIAR EN PRODUCCIÓN)
INSERT INTO usuario (username, nombre_completo, password_hash, activo) VALUES
  ('admin', 'Administrador', crypt('admin123', gen_salt('bf')), true);

INSERT INTO usuario_rol (usuario_id, rol_id) VALUES
  ((SELECT id FROM usuario WHERE username='admin'),
   (SELECT id FROM rol WHERE codigo='ADMIN'));
```

---

## Consultas de validación (Fase 1A)

```sql
-- 1. Ingresos alojamiento del mes por modalidad
SELECT r.modalidad, SUM(fc.monto) AS total
FROM folio_cargo fc
JOIN folio f ON f.id = fc.folio_id
JOIN reserva r ON r.id = f.reserva_id
WHERE fc.centro_id = (SELECT id FROM centro WHERE codigo='ALOJAMIENTO')
  AND date_trunc('month', fc.fecha) = date_trunc('month', now())
  AND NOT fc.anulado
GROUP BY r.modalidad;

-- 2. Cartera de una empresa con detalle de folios
SELECT cc.id, f.id AS folio, cc.monto_original, cc.saldo,
       cc.fecha_emision, cc.fecha_vencimiento, cc.estado
FROM cuenta_cobrar cc
LEFT JOIN folio f ON f.id = cc.folio_id
WHERE cc.cliente_id = :empresa_id
  AND cc.estado IN ('PENDIENTE','PARCIAL','VENCIDA')
ORDER BY cc.fecha_vencimiento;

-- 3. Habitaciones ocupadas hoy y quién paga
SELECT h.numero, hu.nombre_completo AS huesped,
       c.razon_social AS responsable_pago, f.tipo AS tipo_folio
FROM habitacion h
JOIN reserva_habitacion rh ON rh.habitacion_id = h.id
JOIN reserva r ON r.id = rh.reserva_id
JOIN folio f ON f.reserva_habitacion_id = rh.id OR f.reserva_id = r.id
LEFT JOIN huesped hu ON hu.reserva_habitacion_id = rh.id AND hu.es_titular
LEFT JOIN cliente c ON c.id = f.responsable_cliente_id
WHERE CURRENT_DATE BETWEEN r.fecha_entrada AND r.fecha_salida
  AND r.estado = 'CHECKIN';

-- 4. Resultado operativo del mes por centro
SELECT ce.codigo, ce.nombre,
       SUM(CASE WHEN cu.tipo = 'INGRESO' THEN lm.haber - lm.debe ELSE 0 END) AS ingresos,
       SUM(CASE WHEN cu.tipo IN ('COSTO','GASTO') THEN lm.debe - lm.haber ELSE 0 END) AS costos,
       SUM(CASE WHEN cu.tipo = 'INGRESO' THEN lm.haber - lm.debe
                WHEN cu.tipo IN ('COSTO','GASTO') THEN -(lm.debe - lm.haber)
                ELSE 0 END) AS margen
FROM libro_movimiento lm
JOIN centro ce ON ce.id = lm.centro_id
JOIN cuenta cu ON cu.id = lm.cuenta_id
WHERE date_trunc('month', lm.fecha) = date_trunc('month', now())
GROUP BY ce.codigo, ce.nombre
ORDER BY margen DESC;

-- 5. Cuadre de la caja central hoy
SELECT sc.id, sc.monto_apertura,
       sc.monto_apertura
         + COALESCE(SUM(CASE WHEN mc.tipo='VENTA_EFECTIVO' THEN mc.monto END),0)
         + COALESCE(SUM(CASE WHEN mc.tipo='INGRESO' THEN mc.monto END),0)
         - COALESCE(SUM(CASE WHEN mc.tipo='GASTO_EFECTIVO' THEN mc.monto END),0)
         - COALESCE(SUM(CASE WHEN mc.tipo='RETIRO' THEN mc.monto END),0)
         + COALESCE(SUM(CASE WHEN mc.tipo='AJUSTE' THEN mc.monto END),0)
       AS efectivo_esperado
FROM sesion_caja sc
LEFT JOIN movimiento_caja mc ON mc.sesion_caja_id = sc.id
WHERE sc.caja_fisica_id = 1
  AND sc.fecha_apertura::date = CURRENT_DATE
GROUP BY sc.id;
```