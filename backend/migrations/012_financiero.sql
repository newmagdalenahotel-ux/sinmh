CREATE TABLE IF NOT EXISTS cuenta_cobrar (
  id                BIGSERIAL PRIMARY KEY,
  cliente_id        BIGINT NOT NULL REFERENCES cliente(id),
  folio_id          BIGINT REFERENCES folio(id),
  monto_original    NUMERIC(14,2) NOT NULL CHECK (monto_original > 0),
  saldo             NUMERIC(14,2) NOT NULL CHECK (saldo >= 0),
  fecha_emision     DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento DATE,
  estado            VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE'
    CHECK (estado IN ('PENDIENTE', 'PARCIAL', 'PAGADA', 'VENCIDA', 'ANULADA')),
  notas             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cxc_cliente ON cuenta_cobrar(cliente_id, estado);
CREATE INDEX IF NOT EXISTS idx_cxc_vence ON cuenta_cobrar(fecha_vencimiento)
  WHERE estado IN ('PENDIENTE', 'PARCIAL');

CREATE TABLE IF NOT EXISTS cuenta_cobrar_pago (
  id                BIGSERIAL PRIMARY KEY,
  cuenta_cobrar_id  BIGINT NOT NULL REFERENCES cuenta_cobrar(id) ON DELETE CASCADE,
  cobro_id          BIGINT REFERENCES cobro(id),
  monto             NUMERIC(14,2) NOT NULL CHECK (monto > 0),
  fecha             TIMESTAMPTZ NOT NULL DEFAULT now(),
  usuario_id        BIGINT REFERENCES usuario(id),
  notas             TEXT
);

ALTER TABLE cobro ADD COLUMN IF NOT EXISTS cuenta_cobrar_id BIGINT REFERENCES cuenta_cobrar(id);

CREATE TABLE IF NOT EXISTS cuenta_socio (
  id                 BIGSERIAL PRIMARY KEY,
  tipo               VARCHAR(20) NOT NULL CHECK (tipo IN ('APORTE', 'RETIRO')),
  monto              NUMERIC(14,2) NOT NULL CHECK (monto > 0),
  saldo_acumulado    NUMERIC(14,2) NOT NULL,
  fecha              TIMESTAMPTZ NOT NULL DEFAULT now(),
  descripcion        TEXT,
  movimiento_caja_id BIGINT REFERENCES movimiento_caja(id),
  usuario_id         BIGINT REFERENCES usuario(id)
);

CREATE INDEX IF NOT EXISTS idx_cuenta_socio_fecha ON cuenta_socio(fecha);
