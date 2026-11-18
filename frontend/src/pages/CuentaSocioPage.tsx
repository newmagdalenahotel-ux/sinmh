import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { cuentaSocioApi, type CuentaSocioMovimiento } from '../lib/api';

function formatoMoneda(valor: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(valor);
}

function formatoFecha(valor: string) {
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(valor));
}

export function CuentaSocioPage() {
  const { token } = useAuth();
  const [saldo, setSaldo] = useState(0);
  const [movimientos, setMovimientos] = useState<CuentaSocioMovimiento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;

    let activo = true;
    cuentaSocioApi(token)
      .then((respuesta) => {
        if (!activo) return;
        setSaldo(respuesta.saldo);
        setMovimientos(respuesta.movimientos);
      })
      .catch((err) => {
        if (activo) setError(err instanceof Error ? err.message : 'No se pudo cargar la cuenta socio');
      })
      .finally(() => {
        if (activo) setCargando(false);
      });

    return () => {
      activo = false;
    };
  }, [token]);

  if (!token) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gold-dark">Caja</p>
          <h1 className="font-display text-3xl text-stone">Cuenta socio</h1>
          <p className="mt-1 text-sm text-stone-light">
            Aportes y retiros del dueño. Saldo positivo: dinero del socio en el hotel.
          </p>
        </div>
        <Link to="/caja" className="btn-secondary">Ir a caja</Link>
      </div>

      {error && <div className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}

      <section className="card">
        <p className="text-sm text-stone-light">Saldo actual</p>
        <p className="mt-1 font-display text-3xl text-navy">{formatoMoneda(saldo)}</p>
      </section>

      <section className="card">
        <h2 className="font-display text-xl text-stone">Movimientos</h2>

        {cargando ? (
          <p className="mt-4 text-sm text-stone-light">Cargando…</p>
        ) : movimientos.length === 0 ? (
          <p className="mt-4 text-sm text-stone-light">No hay aportes ni retiros registrados.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-cream-dark text-xs uppercase tracking-wide text-stone-light">
                  <th className="py-2 pr-3">Fecha</th>
                  <th className="py-2 pr-3">Tipo</th>
                  <th className="py-2 pr-3">Descripción</th>
                  <th className="py-2 pr-3 text-right">Monto</th>
                  <th className="py-2 text-right">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {movimientos.map((movimiento) => (
                  <tr key={movimiento.id} className="border-b border-cream-dark/60">
                    <td className="py-2 pr-3 text-stone-light">{formatoFecha(movimiento.fecha)}</td>
                    <td className="py-2 pr-3">{movimiento.tipo}</td>
                    <td className="py-2 pr-3 text-stone-light">
                      {movimiento.descripcion ?? '—'}
                    </td>
                    <td className="py-2 pr-3 text-right">
                      {formatoMoneda(Number(movimiento.monto))}
                    </td>
                    <td className="py-2 text-right font-medium">
                      {formatoMoneda(Number(movimiento.saldo_acumulado))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
