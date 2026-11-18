CREATE TABLE IF NOT EXISTS temporada (
  id     BIGSERIAL PRIMARY KEY,
  codigo VARCHAR(10) UNIQUE NOT NULL,
  nombre VARCHAR(40) NOT NULL
);

CREATE TABLE IF NOT EXISTS habitacion (
  id             BIGSERIAL PRIMARY KEY,
  numero         VARCHAR(20) UNIQUE NOT NULL,
  tipo_uso       VARCHAR(20) NOT NULL DEFAULT 'HABITACION'
    CHECK (tipo_uso IN ('HABITACION', 'BODEGA', 'OFICINA')),
  clima          VARCHAR(15) NOT NULL DEFAULT 'AC'
    CHECK (clima IN ('AC', 'VENTILADOR', 'N/A')),
  capacidad_max  INT NOT NULL DEFAULT 1,
  es_suite       BOOLEAN NOT NULL DEFAULT false,
  piso           INT,
  activo         BOOLEAN NOT NULL DEFAULT true,
  notas          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tarifa (
  id            BIGSERIAL PRIMARY KEY,
  tipo_clima    VARCHAR(15) NOT NULL CHECK (tipo_clima IN ('AC', 'VENTILADOR')),
  temporada_id  BIGINT NOT NULL REFERENCES temporada(id),
  acomodacion   INT NOT NULL CHECK (acomodacion BETWEEN 1 AND 6),
  escenario     VARCHAR(10) NOT NULL CHECK (escenario IN ('NORMAL', 'A', 'B', 'C')),
  valor         NUMERIC(14,2) NOT NULL CHECK (valor >= 0),
  UNIQUE (tipo_clima, temporada_id, acomodacion, escenario)
);

CREATE INDEX IF NOT EXISTS idx_habitacion_activo ON habitacion(activo, tipo_uso);
CREATE INDEX IF NOT EXISTS idx_tarifa_busqueda ON tarifa(tipo_clima, temporada_id, acomodacion, escenario);
