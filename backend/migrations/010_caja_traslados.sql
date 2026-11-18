ALTER TABLE movimiento_caja
  ADD COLUMN IF NOT EXISTS contraparte_sesion_id BIGINT REFERENCES sesion_caja(id);

ALTER TABLE movimiento_caja
  ADD COLUMN IF NOT EXISTS contraparte_movimiento_id BIGINT REFERENCES movimiento_caja(id);

CREATE INDEX IF NOT EXISTS idx_movimiento_caja_traslado
  ON movimiento_caja(contraparte_sesion_id);
