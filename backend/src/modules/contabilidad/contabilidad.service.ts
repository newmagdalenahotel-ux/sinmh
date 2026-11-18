type Executor = {
  query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
};

export type LineaAsiento = {
  cuenta: string;
  centro?: string;
  debe?: number;
  haber?: number;
  descripcion?: string;
};

export type AsientoInput = {
  descripcion: string;
  origenTipo: string;
  origenId?: number | null;
  usuarioId?: number | null;
  fecha?: string | null;
  lineas: LineaAsiento[];
};

export async function registrarAsiento(tx: Executor, input: AsientoInput): Promise<number | null> {
  const lineas = input.lineas.filter(
    (linea) => (linea.debe ?? 0) > 0 || (linea.haber ?? 0) > 0
  );

  if (lineas.length === 0) return null;

  const totalDebe = lineas.reduce((suma, linea) => suma + (linea.debe ?? 0), 0);
  const totalHaber = lineas.reduce((suma, linea) => suma + (linea.haber ?? 0), 0);

  if (Math.abs(totalDebe - totalHaber) > 0.01) {
    throw new Error(`Asiento descuadrado: debe ${totalDebe} vs haber ${totalHaber}`);
  }

  const asiento = await tx.query<{ id: number }>(
    `INSERT INTO asiento (fecha, descripcion, origen_tipo, origen_id, usuario_id)
     VALUES (COALESCE($1::timestamptz, now()), $2, $3, $4, $5)
     RETURNING id`,
    [
      input.fecha ?? null,
      input.descripcion,
      input.origenTipo,
      input.origenId ?? null,
      input.usuarioId ?? null,
    ]
  );

  const asientoId = asiento.rows[0]?.id;
  if (!asientoId) throw new Error('No se pudo crear el asiento');

  for (const linea of lineas) {
    const cuenta = await tx.query<{ id: number }>('SELECT id FROM cuenta WHERE codigo = $1', [
      linea.cuenta,
    ]);
    const cuentaId = cuenta.rows[0]?.id;
    if (!cuentaId) throw new Error(`Cuenta contable no encontrada: ${linea.cuenta}`);

    let centroId: number | null = null;
    if (linea.centro) {
      const centro = await tx.query<{ id: number }>('SELECT id FROM centro WHERE codigo = $1', [
        linea.centro,
      ]);
      centroId = centro.rows[0]?.id ?? null;
      if (!centroId) throw new Error(`Centro no encontrado: ${linea.centro}`);
    }

    await tx.query(
      `INSERT INTO asiento_linea
         (asiento_id, cuenta_id, centro_id, debe, haber, descripcion)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        asientoId,
        cuentaId,
        centroId,
        linea.debe ?? 0,
        linea.haber ?? 0,
        linea.descripcion ?? null,
      ]
    );
  }

  return asientoId;
}
