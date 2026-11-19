ALTER TABLE reserva
  ADD COLUMN IF NOT EXISTS origen_reserva VARCHAR(20)
  CHECK (origen_reserva IN ('WHATSAPP', 'TELEFONO', 'DIRECTO', 'CORREO', 'WEB', 'OTA'));
