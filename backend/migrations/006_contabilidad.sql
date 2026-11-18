CREATE TABLE IF NOT EXISTS cuenta (
  id              BIGSERIAL PRIMARY KEY,
  codigo          VARCHAR(20) UNIQUE NOT NULL,
  nombre          VARCHAR(150) NOT NULL,
  tipo            VARCHAR(20) NOT NULL
    CHECK (tipo IN ('ACTIVO', 'PASIVO', 'PATRIMONIO', 'INGRESO', 'COSTO', 'GASTO')),
  cuenta_padre_id BIGINT REFERENCES cuenta(id),
  activo          BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS asiento (
  id           BIGSERIAL PRIMARY KEY,
  fecha        TIMESTAMPTZ NOT NULL DEFAULT now(),
  descripcion  TEXT NOT NULL,
  origen_tipo  VARCHAR(30) NOT NULL,
  origen_id    BIGINT,
  usuario_id   BIGINT REFERENCES usuario(id),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS asiento_linea (
  id           BIGSERIAL PRIMARY KEY,
  asiento_id   BIGINT NOT NULL REFERENCES asiento(id) ON DELETE CASCADE,
  cuenta_id    BIGINT NOT NULL REFERENCES cuenta(id),
  centro_id    BIGINT REFERENCES centro(id),
  debe         NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (debe >= 0),
  haber        NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (haber >= 0),
  descripcion  TEXT,
  CONSTRAINT chk_debe_haber CHECK ((debe = 0) <> (haber = 0))
);

CREATE INDEX IF NOT EXISTS idx_asiento_fecha ON asiento(fecha);
CREATE INDEX IF NOT EXISTS idx_asiento_origen ON asiento(origen_tipo, origen_id);
CREATE INDEX IF NOT EXISTS idx_asiento_linea_cuenta ON asiento_linea(cuenta_id);
CREATE INDEX IF NOT EXISTS idx_asiento_linea_centro ON asiento_linea(centro_id);

CREATE OR REPLACE VIEW libro_movimiento AS
SELECT
  l.id,
  a.fecha,
  l.centro_id,
  l.cuenta_id,
  l.debe,
  l.haber,
  a.origen_tipo,
  a.origen_id,
  COALESCE(l.descripcion, a.descripcion) AS descripcion,
  a.usuario_id,
  l.asiento_id
FROM asiento_linea l
JOIN asiento a ON a.id = l.asiento_id;
