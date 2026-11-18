ALTER TABLE movimiento_caja ADD COLUMN IF NOT EXISTS autorizado_por_id BIGINT REFERENCES usuario(id);
ALTER TABLE movimiento_caja ADD COLUMN IF NOT EXISTS soporte_url TEXT;
