CREATE TABLE IF NOT EXISTS centro (
  id     BIGSERIAL PRIMARY KEY,
  codigo VARCHAR(40) UNIQUE NOT NULL,
  nombre VARCHAR(120) NOT NULL,
  tipo   VARCHAR(20) NOT NULL CHECK (tipo IN ('INGRESO', 'COSTE')),
  activo BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS huesped (
  id                    BIGSERIAL PRIMARY KEY,
  reserva_habitacion_id BIGINT NOT NULL REFERENCES reserva_habitacion(id) ON DELETE CASCADE,
  cliente_id            BIGINT REFERENCES cliente(id),
  nombre_completo       VARCHAR(200) NOT NULL,
  tipo_documento        VARCHAR(10),
  numero_documento      VARCHAR(30),
  telefono              VARCHAR(40),
  email                 VARCHAR(150),
  es_titular            BOOLEAN NOT NULL DEFAULT true,
  checkin_ts            TIMESTAMPTZ NOT NULL DEFAULT now(),
  checkout_ts           TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS folio (
  id                     BIGSERIAL PRIMARY KEY,
  reserva_id             BIGINT NOT NULL REFERENCES reserva(id),
  tipo                   VARCHAR(20) NOT NULL DEFAULT 'MAESTRO'
    CHECK (tipo IN ('MAESTRO', 'HABITACION', 'INDIVIDUAL')),
  responsable_cliente_id BIGINT REFERENCES cliente(id),
  estado                 VARCHAR(20) NOT NULL DEFAULT 'ABIERTO'
    CHECK (estado IN ('ABIERTO', 'CERRADO', 'ANULADO')),
  fecha_apertura         TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_cierre           TIMESTAMPTZ,
  saldo                  NUMERIC(14,2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS folio_cargo (
  id                BIGSERIAL PRIMARY KEY,
  folio_id           BIGINT NOT NULL REFERENCES folio(id) ON DELETE CASCADE,
  fecha              TIMESTAMPTZ NOT NULL DEFAULT now(),
  concepto           VARCHAR(200) NOT NULL,
  centro_id          BIGINT NOT NULL REFERENCES centro(id),
  cantidad           NUMERIC(14,4) NOT NULL DEFAULT 1,
  precio_unitario    NUMERIC(14,2) NOT NULL,
  monto              NUMERIC(14,2) NOT NULL,
  es_cortesia        BOOLEAN NOT NULL DEFAULT false,
  autorizado_por_id  BIGINT REFERENCES usuario(id),
  usuario_id         BIGINT REFERENCES usuario(id),
  anulado            BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS cobro (
  id               BIGSERIAL PRIMARY KEY,
  folio_id         BIGINT REFERENCES folio(id),
  cliente_id       BIGINT REFERENCES cliente(id),
  tipo_documento   VARCHAR(25) NOT NULL DEFAULT 'NINGUNO'
    CHECK (tipo_documento IN ('NINGUNO', 'RECIBO_CAJA', 'FACTURA_ELECTRONICA')),
  monto            NUMERIC(14,2) NOT NULL CHECK (monto > 0),
  metodo_pago      VARCHAR(20) NOT NULL
    CHECK (metodo_pago IN ('EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'CREDITO')),
  sesion_caja_id   BIGINT,
  fecha            TIMESTAMPTZ NOT NULL DEFAULT now(),
  usuario_id       BIGINT NOT NULL REFERENCES usuario(id),
  estado           VARCHAR(20) NOT NULL DEFAULT 'ACTIVO'
    CHECK (estado IN ('ACTIVO', 'ANULADO')),
  notas            TEXT
);

ALTER TABLE reserva ADD COLUMN IF NOT EXISTS incluye_desayuno BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE reserva ADD COLUMN IF NOT EXISTS desayuno_modo VARCHAR(10) NOT NULL DEFAULT 'NO'
  CHECK (desayuno_modo IN ('NO', 'PAGADO', 'INCLUIDO'));
ALTER TABLE reserva ADD COLUMN IF NOT EXISTS desayunos_pax INT NOT NULL DEFAULT 0;
ALTER TABLE reserva ADD COLUMN IF NOT EXISTS desayunos_total INT NOT NULL DEFAULT 0;
ALTER TABLE reserva ADD COLUMN IF NOT EXISTS total_desayuno NUMERIC(14,2) NOT NULL DEFAULT 0;

CREATE SEQUENCE IF NOT EXISTS reserva_codigo_seq;

CREATE INDEX IF NOT EXISTS idx_huesped_reserva ON huesped(reserva_habitacion_id);
CREATE INDEX IF NOT EXISTS idx_folio_reserva ON folio(reserva_id);
CREATE INDEX IF NOT EXISTS idx_folio_cargo_folio ON folio_cargo(folio_id);
CREATE INDEX IF NOT EXISTS idx_cobro_folio ON cobro(folio_id);
