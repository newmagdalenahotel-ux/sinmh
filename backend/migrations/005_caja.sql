CREATE TABLE IF NOT EXISTS punto_venta (
  id        BIGSERIAL PRIMARY KEY,
  codigo    VARCHAR(40) UNIQUE NOT NULL,
  nombre    VARCHAR(120) NOT NULL,
  centro_id BIGINT NOT NULL REFERENCES centro(id),
  activo    BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS sesion_caja (
  id                     BIGSERIAL PRIMARY KEY,
  punto_venta_id         BIGINT NOT NULL REFERENCES punto_venta(id),
  usuario_apertura_id    BIGINT NOT NULL REFERENCES usuario(id),
  usuario_cierre_id      BIGINT REFERENCES usuario(id),
  fecha_apertura         TIMESTAMPTZ NOT NULL DEFAULT now(),
  fecha_cierre           TIMESTAMPTZ,
  monto_apertura         NUMERIC(14,2) NOT NULL DEFAULT 0,
  monto_sistema_efectivo NUMERIC(14,2),
  monto_declarado        NUMERIC(14,2),
  diferencia             NUMERIC(14,2),
  autorizado_por_id      BIGINT REFERENCES usuario(id),
  estado                 VARCHAR(20) NOT NULL DEFAULT 'ABIERTA'
    CHECK (estado IN ('ABIERTA', 'CERRADA')),
  notas                  TEXT
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sesion_abierta
  ON sesion_caja(punto_venta_id)
  WHERE estado = 'ABIERTA';

CREATE TABLE IF NOT EXISTS movimiento_caja (
  id                BIGSERIAL PRIMARY KEY,
  sesion_caja_id    BIGINT NOT NULL REFERENCES sesion_caja(id),
  tipo              VARCHAR(30) NOT NULL CHECK (tipo IN (
    'APERTURA', 'VENTA_EFECTIVO', 'GASTO_EFECTIVO', 'RETIRO', 'INGRESO',
    'AJUSTE', 'APORTE_PAGO', 'RETIRO_DUENO', 'AJUSTE_FALTANTE',
    'AJUSTE_SOBRANTE', 'TRASLADO_SALIDA', 'TRASLADO_ENTRADA'
  )),
  monto             NUMERIC(14,2) NOT NULL CHECK (monto >= 0),
  referencia_tipo   VARCHAR(30),
  referencia_id     BIGINT,
  usuario_id        BIGINT NOT NULL REFERENCES usuario(id),
  fecha             TIMESTAMPTZ NOT NULL DEFAULT now(),
  notas             TEXT
);

CREATE INDEX IF NOT EXISTS idx_movimiento_caja_sesion ON movimiento_caja(sesion_caja_id);
