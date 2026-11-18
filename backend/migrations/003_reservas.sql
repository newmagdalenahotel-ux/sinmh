CREATE TABLE IF NOT EXISTS habitacion_acomodacion (
  habitacion_id BIGINT NOT NULL REFERENCES habitacion(id) ON DELETE CASCADE,
  pax           INT NOT NULL CHECK (pax BETWEEN 1 AND 6),
  PRIMARY KEY (habitacion_id, pax)
);

CREATE TABLE IF NOT EXISTS cliente (
  id               BIGSERIAL PRIMARY KEY,
  tipo             VARCHAR(20) NOT NULL
    CHECK (tipo IN ('PARTICULAR', 'EMPRESA', 'EMPLEADO', 'GRUPO_TRABAJO', 'SOCIO')),
  razon_social     VARCHAR(200) NOT NULL,
  tipo_documento   VARCHAR(10),
  numero_documento VARCHAR(30),
  telefono         VARCHAR(40),
  email            VARCHAR(150),
  cupo_credito     NUMERIC(14,2) NOT NULL DEFAULT 0,
  dias_credito     INT NOT NULL DEFAULT 0,
  activo           BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reserva (
  id                 BIGSERIAL PRIMARY KEY,
  codigo             VARCHAR(20) UNIQUE NOT NULL,
  titular_cliente_id BIGINT REFERENCES cliente(id),
  fecha_entrada      DATE NOT NULL,
  fecha_salida       DATE NOT NULL,
  modalidad          VARCHAR(10) NOT NULL DEFAULT 'NOCHE'
    CHECK (modalidad IN ('NOCHE', 'MENSUAL', 'HORA', 'DIA')),
  estado             VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
    CHECK (estado IN ('PENDIENTE', 'CONFIRMADA', 'CHECKIN', 'CHECKOUT', 'CANCELADA', 'NO_SHOW')),
  total              NUMERIC(14,2) NOT NULL DEFAULT 0,
  saldo              NUMERIC(14,2) NOT NULL DEFAULT 0,
  notas              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (fecha_salida > fecha_entrada)
);

CREATE TABLE IF NOT EXISTS reserva_habitacion (
  id             BIGSERIAL PRIMARY KEY,
  reserva_id     BIGINT NOT NULL REFERENCES reserva(id) ON DELETE CASCADE,
  habitacion_id  BIGINT NOT NULL REFERENCES habitacion(id),
  pax            INT NOT NULL CHECK (pax BETWEEN 1 AND 6),
  clima          VARCHAR(15) NOT NULL CHECK (clima IN ('AC', 'VENTILADOR')),
  precio_noche   NUMERIC(14,2) NOT NULL DEFAULT 0,
  fecha_entrada  DATE NOT NULL,
  fecha_salida   DATE NOT NULL,
  estado         VARCHAR(20) NOT NULL DEFAULT 'ACTIVA'
    CHECK (estado IN ('ACTIVA', 'CHECKIN', 'CHECKOUT', 'CANCELADA')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (fecha_salida > fecha_entrada)
);

CREATE INDEX IF NOT EXISTS idx_reserva_hab_fechas
  ON reserva_habitacion(habitacion_id, fecha_entrada, fecha_salida);
CREATE INDEX IF NOT EXISTS idx_reserva_fechas
  ON reserva(fecha_entrada, fecha_salida);
