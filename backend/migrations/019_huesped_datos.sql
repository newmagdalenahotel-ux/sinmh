ALTER TABLE reserva_habitacion
  ADD COLUMN IF NOT EXISTS huesped_tipo_documento VARCHAR(10);

ALTER TABLE reserva_habitacion
  ADD COLUMN IF NOT EXISTS huesped_telefono VARCHAR(40);

ALTER TABLE reserva_habitacion
  ADD COLUMN IF NOT EXISTS huesped_email VARCHAR(150);
