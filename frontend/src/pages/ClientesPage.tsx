import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { MoneyInput } from '../components/MoneyInput';
import { useToast } from '../components/Toast';
import {
  actualizarClienteApi,
  clientesApi,
  crearClienteApi,
  type Cliente,
} from '../lib/api';

function formatoMoneda(valor: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(valor);
}

const formularioInicial = {
  tipo: 'EMPRESA' as 'PARTICULAR' | 'EMPRESA' | 'EMPLEADO' | 'GRUPO_TRABAJO' | 'SOCIO',
  razon_social: '',
  tipo_documento: 'NIT',
  numero_documento: '',
  telefono: '',
  email: '',
  cupo_credito: 0 as number | '',
  dias_credito: '0',
};

export function ClientesPage() {
  const { token } = useAuth();
  const toast = useToast();
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [form, setForm] = useState(formularioInicial);
  const [cargando, setCargando] = useState(true);
  const [creando, setCreando] = useState(false);
  const [error, setError] = useState('');
  const [drawerAbierto, setDrawerAbierto] = useState(false);

  useEffect(() => {
    if (!drawerAbierto) return;

    const cerrarConEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDrawerAbierto(false);
    };
    window.addEventListener('keydown', cerrarConEscape);

    return () => window.removeEventListener('keydown', cerrarConEscape);
  }, [drawerAbierto]);

  useEffect(() => {
    if (token) void cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function cargar() {
    if (!token) return;
    setCargando(true);
    setError('');

    try {
      const respuesta = await clientesApi(token);
      setClientes(respuesta.clientes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los clientes');
    } finally {
      setCargando(false);
    }
  }

  async function crear() {
    if (!token) return;
    if (!form.razon_social.trim()) {
      setError('Escribe el nombre o razón social');
      return;
    }

    setCreando(true);
    setError('');

    try {
      const respuesta = await crearClienteApi(token, {
        tipo: form.tipo,
        razon_social: form.razon_social.trim(),
        tipo_documento: form.tipo_documento || undefined,
        numero_documento: form.numero_documento.trim() || undefined,
        telefono: form.telefono.trim() || undefined,
        email: form.email.trim() || undefined,
        cupo_credito: Number(form.cupo_credito || 0),
        dias_credito: Number(form.dias_credito || 0),
      });
      toast.success(`Cliente ${respuesta.cliente.razon_social} creado`);
      setForm(formularioInicial);
      setDrawerAbierto(false);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el cliente');
    } finally {
      setCreando(false);
    }
  }

  async function editarCredito(cliente: Cliente) {
    if (!token) return;

    const cupo = window.prompt('Cupo de crédito', String(Number(cliente.cupo_credito)));
    if (cupo === null) return;
    const dias = window.prompt('Días de crédito', String(cliente.dias_credito));
    if (dias === null) return;

    setError('');
    try {
      await actualizarClienteApi(token, cliente.id, {
        cupo_credito: Number(cupo || 0),
        dias_credito: Number(dias || 0),
      });
      toast.success(`Crédito de ${cliente.razon_social} actualizado`);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo actualizar el cliente');
    }
  }

  if (!token) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button className="btn-primary" onClick={() => setDrawerAbierto(true)}>
          Nuevo cliente
        </button>
      </div>

      {error && <div className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}

      <div className="space-y-6">
        <section className="card">
          <h2 className="font-display text-xl text-stone">Directorio</h2>

          {cargando ? (
            <p className="mt-4 text-sm text-stone-light">Cargando…</p>
          ) : clientes.length === 0 ? (
            <p className="mt-4 text-sm text-stone-light">No hay clientes registrados.</p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-cream-dark text-xs uppercase tracking-wide text-stone-light">
                    <th className="py-2 pr-3">Cliente</th>
                    <th className="py-2 pr-3">Tipo</th>
                    <th className="py-2 pr-3">Documento</th>
                    <th className="py-2 pr-3 text-right">Cupo</th>
                    <th className="py-2 pr-3 text-right">Días</th>
                    <th className="py-2 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {clientes.map((cliente) => (
                    <tr key={cliente.id} className="border-b border-cream-dark/60">
                      <td className="py-3 pr-3">
                        <p className="font-medium">{cliente.razon_social}</p>
                        <p className="text-xs text-stone-light">
                          {cliente.telefono ?? cliente.email ?? 'Sin contacto'}
                        </p>
                      </td>
                      <td className="py-3 pr-3 text-stone-light">{cliente.tipo}</td>
                      <td className="py-3 pr-3 text-stone-light">
                        {cliente.numero_documento ?? '—'}
                      </td>
                      <td className="py-3 pr-3 text-right">
                        {formatoMoneda(Number(cliente.cupo_credito))}
                      </td>
                      <td className="py-3 pr-3 text-right">{cliente.dias_credito}</td>
                      <td className="py-3 text-right">
                        <button
                          className="rounded-lg border border-gold/40 px-2 py-1 text-xs text-gold-dark"
                          onClick={() => void editarCredito(cliente)}
                        >
                          Crédito
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {drawerAbierto && (
          <button
            type="button"
            aria-label="Cerrar formulario"
            className="fixed inset-0 z-40 bg-navy-dark/60"
            onClick={() => setDrawerAbierto(false)}
          />
        )}

        <div
          className={
            drawerAbierto
              ? 'fixed inset-y-0 right-0 z-50 w-full max-w-lg overflow-y-auto bg-cream p-4 shadow-2xl sm:p-6'
              : 'hidden'
          }
          role="dialog"
          aria-modal="true"
          aria-label="Nuevo cliente"
        >
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-stone-light">
              Nuevo cliente
            </p>
            <button
              type="button"
              className="btn-secondary px-3 py-1.5 text-xs"
              onClick={() => setDrawerAbierto(false)}
            >
              Cerrar
            </button>
          </div>

          <section className="card">
            <h2 className="font-display text-xl text-stone">Datos del cliente</h2>

          <div className="mt-4 space-y-3">
            <div>
              <label className="label" htmlFor="tipo_cliente">Tipo</label>
              <select
                id="tipo_cliente"
                className="input"
                value={form.tipo}
                onChange={(event) =>
                  setForm({
                    ...form,
                    tipo: event.target.value as typeof form.tipo,
                    tipo_documento: event.target.value === 'EMPRESA' ? 'NIT' : 'CC',
                  })
                }
              >
                <option value="EMPRESA">Empresa</option>
                <option value="EMPLEADO">Empleado</option>
                <option value="GRUPO_TRABAJO">Grupo de trabajo</option>
                <option value="PARTICULAR">Particular</option>
                <option value="SOCIO">Socio</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="razon_social">Nombre o razón social</label>
              <input
                id="razon_social"
                className="input"
                value={form.razon_social}
                onChange={(event) => setForm({ ...form, razon_social: event.target.value })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="tipo_documento">Tipo documento</label>
                <input
                  id="tipo_documento"
                  className="input"
                  value={form.tipo_documento}
                  onChange={(event) => setForm({ ...form, tipo_documento: event.target.value })}
                />
              </div>
              <div>
                <label className="label" htmlFor="numero_documento">Número</label>
                <input
                  id="numero_documento"
                  className="input"
                  value={form.numero_documento}
                  onChange={(event) => setForm({ ...form, numero_documento: event.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="cupo_credito">Cupo de crédito</label>
                <MoneyInput
                  id="cupo_credito"
                  value={form.cupo_credito}
                  onChange={(value) => setForm({ ...form, cupo_credito: value })}
                />
              </div>
              <div>
                <label className="label" htmlFor="dias_credito">Días de crédito</label>
                <input
                  id="dias_credito"
                  type="number"
                  min="0"
                  className="input"
                  value={form.dias_credito}
                  onChange={(event) => setForm({ ...form, dias_credito: event.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="telefono_cliente">Teléfono</label>
              <input
                id="telefono_cliente"
                className="input"
                value={form.telefono}
                onChange={(event) => setForm({ ...form, telefono: event.target.value })}
              />
            </div>
            <div>
              <label className="label" htmlFor="email_cliente">Email</label>
              <input
                id="email_cliente"
                className="input"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </div>

            <button
              className="btn-primary w-full"
              onClick={() => void crear()}
              disabled={creando || !form.razon_social.trim()}
            >
              {creando ? 'Creando…' : 'Crear cliente'}
            </button>
          </div>
        </section>
        </div>
      </div>
    </div>
  );
}
