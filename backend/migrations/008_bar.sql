CREATE TABLE IF NOT EXISTS producto (
  id            BIGSERIAL PRIMARY KEY,
  codigo        VARCHAR(40) UNIQUE NOT NULL,
  nombre        VARCHAR(150) NOT NULL,
  categoria     VARCHAR(60),
  precio_venta  NUMERIC(14,2) NOT NULL CHECK (precio_venta >= 0),
  costo         NUMERIC(14,4) NOT NULL DEFAULT 0 CHECK (costo >= 0),
  stock         NUMERIC(14,4) NOT NULL DEFAULT 0,
  stock_minimo  NUMERIC(14,4) NOT NULL DEFAULT 0,
  activo        BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS movimiento_inventario (
  id              BIGSERIAL PRIMARY KEY,
  producto_id     BIGINT NOT NULL REFERENCES producto(id),
  tipo            VARCHAR(20) NOT NULL
    CHECK (tipo IN ('ENTRADA', 'SALIDA', 'AJUSTE', 'PERDIDA')),
  cantidad        NUMERIC(14,4) NOT NULL CHECK (cantidad > 0),
  costo_unitario  NUMERIC(14,4) NOT NULL DEFAULT 0,
  referencia_tipo VARCHAR(30),
  referencia_id   BIGINT,
  usuario_id      BIGINT REFERENCES usuario(id),
  fecha           TIMESTAMPTZ NOT NULL DEFAULT now(),
  notas           TEXT
);

CREATE TABLE IF NOT EXISTS venta_bar (
  id             BIGSERIAL PRIMARY KEY,
  fecha          TIMESTAMPTZ NOT NULL DEFAULT now(),
  centro_id      BIGINT NOT NULL REFERENCES centro(id),
  usuario_id     BIGINT NOT NULL REFERENCES usuario(id),
  cliente_id     BIGINT REFERENCES cliente(id),
  folio_id       BIGINT REFERENCES folio(id),
  total          NUMERIC(14,2) NOT NULL CHECK (total >= 0),
  metodo_pago    VARCHAR(20) NOT NULL
    CHECK (metodo_pago IN ('EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'CREDITO', 'CARGO_HABITACION')),
  tipo_documento VARCHAR(25) NOT NULL DEFAULT 'NINGUNO'
    CHECK (tipo_documento IN ('NINGUNO', 'RECIBO_CAJA', 'FACTURA_ELECTRONICA')),
  sesion_caja_id BIGINT REFERENCES sesion_caja(id),
  estado         VARCHAR(20) NOT NULL DEFAULT 'PAGADA'
    CHECK (estado IN ('PAGADA', 'CARGADA', 'ANULADA')),
  notas          TEXT
);

CREATE TABLE IF NOT EXISTS venta_bar_detalle (
  id              BIGSERIAL PRIMARY KEY,
  venta_id        BIGINT NOT NULL REFERENCES venta_bar(id) ON DELETE CASCADE,
  producto_id     BIGINT NOT NULL REFERENCES producto(id),
  cantidad        NUMERIC(14,4) NOT NULL CHECK (cantidad > 0),
  precio_unitario NUMERIC(14,2) NOT NULL,
  costo_unitario  NUMERIC(14,4) NOT NULL DEFAULT 0,
  total           NUMERIC(14,2) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_venta_bar_fecha ON venta_bar(fecha);
CREATE INDEX IF NOT EXISTS idx_producto_activo ON producto(activo);
