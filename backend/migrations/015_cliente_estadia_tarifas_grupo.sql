-- 015: datos de cliente/estadía, tarifas negociadas y reserva maestra.

ALTER TABLE cliente ADD COLUMN IF NOT EXISTS direccion VARCHAR(200);
ALTER TABLE cliente ADD COLUMN IF NOT EXISTS ciudad VARCHAR(100);
ALTER TABLE cliente ADD COLUMN IF NOT EXISTS notas TEXT;

ALTER TABLE cliente ADD COLUMN IF NOT EXISTS tarifa_plan VARCHAR(20) NOT NULL DEFAULT 'PUBLICA'
  CHECK (tarifa_plan IN ('PUBLICA', 'EMPRESA', 'EMPLEADO', 'GRUPO'));
ALTER TABLE cliente ADD COLUMN IF NOT EXISTS tarifa_precio_noche NUMERIC(14,2)
  CHECK (tarifa_precio_noche IS NULL OR tarifa_precio_noche >= 0);
ALTER TABLE cliente ADD COLUMN IF NOT EXISTS tarifa_desayuno_incluido BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE cliente ADD COLUMN IF NOT EXISTS tarifa_vigente_desde DATE;
ALTER TABLE cliente ADD COLUMN IF NOT EXISTS tarifa_vigente_hasta DATE;

ALTER TABLE reserva ADD COLUMN IF NOT EXISTS motivo_visita VARCHAR(120);
ALTER TABLE reserva ADD COLUMN IF NOT EXISTS como_llego VARCHAR(60);
ALTER TABLE reserva ADD COLUMN IF NOT EXISTS placa_vehiculo VARCHAR(20);
ALTER TABLE reserva ADD COLUMN IF NOT EXISTS tarifa_plan VARCHAR(20) NOT NULL DEFAULT 'PUBLICA'
  CHECK (tarifa_plan IN ('PUBLICA', 'EMPRESA', 'EMPLEADO', 'GRUPO'));
ALTER TABLE reserva ADD COLUMN IF NOT EXISTS tarifa_negociada NUMERIC(14,2);
ALTER TABLE reserva ADD COLUMN IF NOT EXISTS tarifa_motivo VARCHAR(200);

CREATE TABLE IF NOT EXISTS reserva_maestra (
  id                 BIGSERIAL PRIMARY KEY,
  codigo             VARCHAR(24) UNIQUE NOT NULL,
  pagador_cliente_id BIGINT NOT NULL REFERENCES cliente(id),
  fecha_entrada      DATE NOT NULL,
  fecha_salida       DATE NOT NULL,
  estado             VARCHAR(20) NOT NULL DEFAULT 'CONFIRMADA'
    CHECK (estado IN ('PENDIENTE', 'CONFIRMADA', 'CHECKIN', 'CHECKOUT', 'CANCELADA', 'NO_SHOW')),
  notas              TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (fecha_salida > fecha_entrada)
);

ALTER TABLE reserva ADD COLUMN IF NOT EXISTS maestra_id BIGINT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'reserva_maestra_id_fkey'
  ) THEN
    ALTER TABLE reserva
      ADD CONSTRAINT reserva_maestra_id_fkey
      FOREIGN KEY (maestra_id) REFERENCES reserva_maestra(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE SEQUENCE IF NOT EXISTS reserva_maestra_codigo_seq;

CREATE INDEX IF NOT EXISTS idx_reserva_maestra ON reserva(maestra_id);
CREATE INDEX IF NOT EXISTS idx_reserva_maestra_pagador ON reserva_maestra(pagador_cliente_id);
CREATE INDEX IF NOT EXISTS idx_cliente_tarifa ON cliente(tarifa_plan);
