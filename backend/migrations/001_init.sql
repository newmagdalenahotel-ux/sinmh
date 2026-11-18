CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TABLE IF NOT EXISTS configuracion (
  clave      VARCHAR(80) PRIMARY KEY,
  valor      TEXT NOT NULL,
  tipo       VARCHAR(20) NOT NULL DEFAULT 'STRING',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS rol (
  id     BIGSERIAL PRIMARY KEY,
  codigo VARCHAR(40) UNIQUE NOT NULL,
  nombre VARCHAR(80) NOT NULL
);

CREATE TABLE IF NOT EXISTS usuario (
  id              BIGSERIAL PRIMARY KEY,
  username        VARCHAR(60) UNIQUE NOT NULL,
  nombre_completo VARCHAR(150) NOT NULL,
  email           VARCHAR(150),
  password_hash   TEXT NOT NULL,
  activo          BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS usuario_rol (
  usuario_id BIGINT NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
  rol_id     BIGINT NOT NULL REFERENCES rol(id) ON DELETE CASCADE,
  PRIMARY KEY (usuario_id, rol_id)
);
