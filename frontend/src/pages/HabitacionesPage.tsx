import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  actualizarEstadoHabitacionApi,
  tableroHabitacionesApi,
  type HabitacionTablero,
} from '../lib/api';

const colores: Record<HabitacionTablero['estado'], string> = {
  LIBRE: 'border-success/40 bg-success/5',
  OCUPADA: 'border-navy/30 bg-navy/5',
  RESERVADA: 'border-gold/50 bg-gold/5',
  SUCIA: 'border-warning/50 bg-warning/5',
  MANTENIMIENTO: 'border-stone/30 bg-stone/5',
};

const etiquetas: Record<HabitacionTablero['estado'], string> = {
  LIBRE: 'Libre',
  OCUPADA: 'Ocupada',
  RESERVADA: 'Reservada',
  SUCIA: 'Sucia',
  MANTENIMIENTO: 'Mantenimiento',
};

export function HabitacionesPage() {
  const { token } = useAuth();
  const [habitaciones, setHabitaciones] = useState<HabitacionTablero[]>([]);
  const [piso, setPiso] = useState('');
  const [clima, setClima] = useState('');
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  useEffect(() => {
    if (token) void cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function cargar() {
    if (!token) return;
    setCargando(true);
    setError('');

    try {
      const respuesta = await tableroHabitacionesApi(token);
      setHabitaciones(respuesta.habitaciones);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el tablero');
    } finally {
      setCargando(false);
    }
  }

  async function cambiarEstado(
    habitacion: HabitacionTablero,
    estado: 'LIMPIA' | 'SUCIA' | 'MANTENIMIENTO'
  ) {
    if (!token) return;
    setProcesando(habitacion.id);
    setError('');
    setExito('');

    try {
      await actualizarEstadoHabitacionApi(token, habitacion.id, estado);
      setExito(`Habitación ${habitacion.numero}: ${estado.toLowerCase()}`);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar la habitación');
    } finally {
      setProcesando(null);
    }
  }

  if (!token) return null;

  const pisos = [
    ...new Set(
      habitaciones
        .map((habitacion) => habitacion.piso)
        .filter((valor): valor is number => valor !== null)
    ),
  ];
  const filtradas = habitaciones.filter(
    (habitacion) =>
      (!piso || String(habitacion.piso) === piso) &&
      (!clima || habitacion.clima === clima)
  );

  const resumen = {
    libres: habitaciones.filter((h) => h.estado === 'LIBRE').length,
    ocupadas: habitaciones.filter((h) => h.estado === 'OCUPADA').length,
    sucias: habitaciones.filter((h) => h.estado === 'SUCIA').length,
    reservadas: habitaciones.filter((h) => h.estado === 'RESERVADA').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gold-dark">Alojamiento</p>
          <h1 className="font-display text-3xl text-stone">Tablero de habitaciones</h1>
          <p className="mt-1 text-sm text-stone-light">
            Estado de las 31 habitaciones rentables.
          </p>
        </div>
        <Link to="/checkin" className="btn-primary">Nuevo check-in</Link>
      </div>

      {error && <div className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}
      {exito && <div className="rounded-xl bg-success/10 px-4 py-3 text-sm text-success">{exito}</div>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="card"><p className="text-sm text-stone-light">Libres</p><p className="mt-1 font-display text-2xl text-success">{resumen.libres}</p></div>
        <div className="card"><p className="text-sm text-stone-light">Ocupadas</p><p className="mt-1 font-display text-2xl text-navy">{resumen.ocupadas}</p></div>
        <div className="card"><p className="text-sm text-stone-light">Reservadas</p><p className="mt-1 font-display text-2xl text-gold-dark">{resumen.reservadas}</p></div>
        <div className="card"><p className="text-sm text-stone-light">Sucias</p><p className="mt-1 font-display text-2xl text-warning">{resumen.sucias}</p></div>
      </div>

      <div className="flex flex-wrap gap-2">
        <select className="input w-auto py-2 text-sm" value={piso} onChange={(event) => setPiso(event.target.value)}>
          <option value="">Todos los pisos</option>
          {pisos.map((valor) => <option key={valor} value={valor}>Piso {valor}</option>)}
        </select>
        <select className="input w-auto py-2 text-sm" value={clima} onChange={(event) => setClima(event.target.value)}>
          <option value="">Todo clima</option>
          <option value="AC">Aire acondicionado</option>
          <option value="VENTILADOR">Ventilador</option>
        </select>
        <button className="btn-secondary px-3 py-2 text-sm" onClick={() => void cargar()}>
          Actualizar
        </button>
      </div>

      {cargando ? (
        <p className="text-sm text-stone-light">Cargando tablero…</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtradas.map((habitacion) => (
            <div key={habitacion.id} className={`rounded-xl border p-4 ${colores[habitacion.estado]}`}>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-display text-2xl text-stone">{habitacion.numero}</p>
                  <p className="text-xs text-stone-light">
                    {habitacion.clima} · {habitacion.capacidad_max} pax
                    {habitacion.es_suite ? ' · suite' : ''}
                  </p>
                </div>
                <span className="rounded-full bg-white/70 px-2 py-1 text-[10px] font-medium">
                  {etiquetas[habitacion.estado]}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-1">
                {habitacion.estado === 'LIBRE' && (
                  <Link to="/checkin" className="rounded-lg bg-navy px-2 py-1 text-xs text-cream">
                    Check-in
                  </Link>
                )}
                {habitacion.estado !== 'OCUPADA' && habitacion.estado !== 'RESERVADA' && (
                  <>
                    {habitacion.estado_operativo !== 'LIMPIA' && (
                      <button
                        className="rounded-lg border border-success/40 px-2 py-1 text-xs text-success"
                        onClick={() => void cambiarEstado(habitacion, 'LIMPIA')}
                        disabled={procesando === habitacion.id}
                      >
                        Limpiar
                      </button>
                    )}
                    {habitacion.estado_operativo !== 'SUCIA' && (
                      <button
                        className="rounded-lg border border-warning/40 px-2 py-1 text-xs text-warning"
                        onClick={() => void cambiarEstado(habitacion, 'SUCIA')}
                        disabled={procesando === habitacion.id}
                      >
                        Sucia
                      </button>
                    )}
                    {habitacion.estado_operativo !== 'MANTENIMIENTO' && (
                      <button
                        className="rounded-lg border border-stone/30 px-2 py-1 text-xs text-stone-light"
                        onClick={() => void cambiarEstado(habitacion, 'MANTENIMIENTO')}
                        disabled={procesando === habitacion.id}
                      >
                        Mantenimiento
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
