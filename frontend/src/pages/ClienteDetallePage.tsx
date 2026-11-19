import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { RecordLayout } from '../components/RecordLayout';
import { clienteApi, type Cliente } from '../lib/api';

function formatoMoneda(valor: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(valor);
}

function formatoFecha(valor: string | null) {
  if (!valor) return '—';
  return new Intl.DateTimeFormat('es-CO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
    .format(new Date(`${valor.slice(0, 10)}T12:00:00`))
    .replace(/ de /g, ' ');
}

export function ClienteDetallePage() {
  const { token } = useAuth();
  const { id } = useParams();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function cargar() {
      if (!token || !id) return;
      setCargando(true);
      setError('');
      try {
        setCliente((await clienteApi(token, Number(id))).cliente);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No se pudo cargar el cliente');
      } finally {
        setCargando(false);
      }
    }
    void cargar();
  }, [token, id]);

  if (cargando) return <p className="text-sm text-stone-light">Cargando cliente…</p>;

  if (error || !cliente) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error">
          {error || 'Cliente no encontrado'}
        </div>
        <Link to="/clientes" className="btn-secondary">Volver a clientes</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-stone">{cliente.razon_social}</h1>
          <p className="mt-1 text-sm text-stone-light">
            {cliente.tipo} · {cliente.tipo_documento ?? ''} {cliente.numero_documento ?? ''}
          </p>
        </div>
        <Link to="/clientes" className="btn-secondary">Volver</Link>
      </div>

      <RecordLayout
        sidebar={
          <>
            <section className="card">
              <h2 className="font-display text-xl text-stone">Crédito</h2>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-stone-light">Cupo</dt>
                  <dd className="font-medium">{formatoMoneda(Number(cliente.cupo_credito))}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-stone-light">Días</dt>
                  <dd>{cliente.dias_credito}</dd>
                </div>
              </dl>
            </section>

            <section className="card">
              <h2 className="font-display text-xl text-stone">Tarifa</h2>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-stone-light">Plan</dt>
                  <dd className="font-medium">{cliente.tarifa_plan}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-stone-light">Precio/noche</dt>
                  <dd>
                    {cliente.tarifa_precio_noche
                      ? formatoMoneda(Number(cliente.tarifa_precio_noche))
                      : 'Matriz pública'}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-stone-light">Desayuno</dt>
                  <dd>{cliente.tarifa_desayuno_incluido ? 'Incluido' : 'No incluido'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-stone-light">Vigencia</dt>
                  <dd className="text-right text-xs">
                    {formatoFecha(cliente.tarifa_vigente_desde)} —{' '}
                    {formatoFecha(cliente.tarifa_vigente_hasta)}
                  </dd>
                </div>
              </dl>
            </section>
          </>
        }
      >
        <section className="card">
          <h2 className="font-display text-xl text-stone">Contacto</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-stone-light">Teléfono</dt>
              <dd className="mt-1 text-stone">{cliente.telefono ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-stone-light">Email</dt>
              <dd className="mt-1 text-stone">{cliente.email ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-stone-light">Dirección</dt>
              <dd className="mt-1 text-stone">{cliente.direccion ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-stone-light">Ciudad</dt>
              <dd className="mt-1 text-stone">{cliente.ciudad ?? '—'}</dd>
            </div>
          </dl>
        </section>

        <section className="card">
          <h2 className="font-display text-xl text-stone">Notas</h2>
          <p className="mt-2 text-sm text-stone-light">{cliente.notas ?? 'Sin notas.'}</p>
        </section>

        <section className="card">
          <h2 className="font-display text-xl text-stone">Datos comerciales</h2>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-stone-light">Tipo de cliente</dt>
              <dd className="mt-1 text-stone">{cliente.tipo}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-stone-light">Documento</dt>
              <dd className="mt-1 text-stone">
                {cliente.tipo_documento ?? ''} {cliente.numero_documento ?? ''}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-stone-light">Estado</dt>
              <dd className="mt-1 text-stone">{cliente.activo ? 'Activo' : 'Inactivo'}</dd>
            </div>
          </dl>
        </section>
      </RecordLayout>
    </div>
  );
}
