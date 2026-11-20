import { db } from '../../db.js';

export type TemporadaCodigo = 'BAJA' | 'ALTA';
export type EscenarioCodigo = 'NORMAL' | 'A' | 'B' | 'C';

export type Cotizacion = {
  habitacion: {
    id: number;
    numero: string;
    clima: 'AC' | 'VENTILADOR';
    es_suite: boolean;
  };
  pax: number;
  acomodacion: number;
  temporada: string;
  escenario: string;
  es_suite_premium: boolean;
  uso_parcial: boolean;
  precio: number;
};

export type ResultadoCotizacion =
  | { ok: true; cotizacion: Cotizacion }
  | { ok: false; status: number; error: string };

export async function cotizarHabitacion(
  habitacionId: number,
  pax: number,
  temporada: TemporadaCodigo,
  escenario: EscenarioCodigo,
  permitirUsoParcial = false
): Promise<ResultadoCotizacion> {
  const consulta = await db.query<{
    id: number;
    numero: string;
    clima: 'AC' | 'VENTILADOR';
    es_suite: boolean;
    capacidad_max: number;
    permitido: number | null;
  }>(
    `SELECT h.id, h.numero, h.clima, h.es_suite, h.capacidad_max, ha.pax AS permitido
     FROM habitacion h
     LEFT JOIN habitacion_acomodacion ha ON ha.habitacion_id = h.id AND ha.pax = $2
     WHERE h.id = $1 AND h.activo = true AND h.tipo_uso = 'HABITACION'`,
    [habitacionId, pax]
  );

  const habitacion = consulta.rows[0];
  if (!habitacion) {
    return {
      ok: false,
      status: 400,
      error: `La habitación no está disponible para ${pax} personas`,
    };
  }

  const usoParcial =
    permitirUsoParcial && habitacion.permitido === null && habitacion.capacidad_max >= pax;

  if (habitacion.permitido === null && !usoParcial) {
    return {
      ok: false,
      status: 400,
      error: `La habitación no está disponible para ${pax} personas`,
    };
  }

  const esSuitePremium = habitacion.es_suite && pax === 2 && !usoParcial;
  const acomodacion = esSuitePremium ? 6 : pax;
  const temporadaCodigo = habitacion.clima === 'VENTILADOR' ? 'UNICA' : temporada;
  const escenarioCodigo = habitacion.clima === 'VENTILADOR' ? 'NORMAL' : escenario;

  const tarifa = await db.query<{ valor: string }>(
    `SELECT t.valor
     FROM tarifa t
     JOIN temporada te ON te.id = t.temporada_id
     WHERE t.tipo_clima = $1 AND te.codigo = $2 AND t.acomodacion = $3 AND t.escenario = $4
     LIMIT 1`,
    [habitacion.clima, temporadaCodigo, acomodacion, escenarioCodigo]
  );

  if (!tarifa.rows[0]) {
    return { ok: false, status: 404, error: 'No hay tarifa para esa combinación' };
  }

  return {
    ok: true,
    cotizacion: {
      habitacion: {
        id: habitacion.id,
        numero: habitacion.numero,
        clima: habitacion.clima,
        es_suite: habitacion.es_suite,
      },
      pax,
      acomodacion,
      temporada: temporadaCodigo,
      escenario: escenarioCodigo,
      es_suite_premium: esSuitePremium,
      uso_parcial: usoParcial,
      precio: Number(tarifa.rows[0].valor),
    },
  };
}
