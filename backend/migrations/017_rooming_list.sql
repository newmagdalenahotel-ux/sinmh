ALTER TABLE reserva_habitacion
  ADD COLUMN IF NOT EXISTS huesped_nombre VARCHAR(200);

ALTER TABLE reserva_habitacion
  ADD COLUMN IF NOT EXISTS huesped_documento VARCHAR(30);
