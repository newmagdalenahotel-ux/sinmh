import { useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { MoneyInput } from '../components/MoneyInput';
import { SlideOver } from '../components/SlideOver';
import { useToast } from '../components/Toast';
import { ClienteDetalleContenido } from './ClienteDetallePage';
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
  direccion: '',
  ciudad: '',
  notas: '',
  cupo_credito: 0 as number | '',
  dias_credito: '0',
  tarifa_plan: 'PUBLICA' as 'PUBLICA' | 'EMPRESA' | 'EMPLEADO' | 'GRUPO',
  tarifa_precio_noche: 0 as number | '',
  tarifa_desayuno_incluido: false,
  tarifa_vigente_desde: '',
  tarifa_vigente_hasta: '',
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
  const [clienteEditando, setClienteEditando] = useState<Cliente | null>(null);
  const [clienteVer, setClienteVer] = useState<Cliente | null>(null);

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

  function abrirNuevo() {
    setClienteEditando(null);
    setClienteVer(null);
    setForm(formularioInicial);
    setError('');
    setDrawerAbierto(true);
  }

  function abrirVer(cliente: Cliente) {
    setDrawerAbierto(false);
    setClienteEditando(null);
    setClienteVer(cliente);
  }

  function abrirEditar(cliente: Cliente) {
    setClienteEditando(cliente);
    setClienteVer(null);
    setForm({
      tipo: cliente.tipo as typeof formularioInicial.tipo,
      razon_social: cliente.razon_social,
      tipo_documento: cliente.tipo_documento ?? 'CC',
      numero_documento: cliente.numero_documento ?? '',
      telefono: cliente.telefono ?? '',
      email: cliente.email ?? '',
      direccion: cliente.direccion ?? '',
      ciudad: cliente.ciudad ?? '',
      notas: cliente.notas ?? '',
      cupo_credito: Number(cliente.cupo_credito),
      dias_credito: String(cliente.dias_credito),
      tarifa_plan: cliente.tarifa_plan,
      tarifa_precio_noche: Number(cliente.tarifa_precio_noche ?? 0),
      tarifa_desayuno_incluido: cliente.tarifa_desayuno_incluido,
      tarifa_vigente_desde: cliente.tarifa_vigente_desde?.slice(0, 10) ?? '',
      tarifa_vigente_hasta: cliente.tarifa_vigente_hasta?.slice(0, 10) ?? '',
    });
    setError('');
    setDrawerAbierto(true);
  }

  async function crear() {
    if (!token) return;
    if (!form.razon_social.trim()) {
      setError('Escribe el nombre o razón social');
      return;
    }

    setCreando(true);
    setError('');

    const payload = {
      tipo: form.tipo,
      razon_social: form.razon_social.trim(),
      tipo_documento: form.tipo_documento || undefined,
      numero_documento: form.numero_documento.trim() || undefined,
      telefono: form.telefono.trim() || undefined,
      email: form.email.trim() || undefined,
      direccion: form.direccion.trim() || undefined,
      ciudad: form.ciudad.trim() || undefined,
      notas: form.notas.trim() || undefined,
      cupo_credito: Number(form.cupo_credito || 0),
      dias_credito: Number(form.dias_credito || 0),
      tarifa_plan: form.tarifa_plan,
      tarifa_precio_noche:
        form.tarifa_plan === 'PUBLICA' ? undefined : Number(form.tarifa_precio_noche || 0),
      tarifa_desayuno_incluido: form.tarifa_desayuno_incluido,
      tarifa_vigente_desde: form.tarifa_vigente_desde || undefined,
      tarifa_vigente_hasta: form.tarifa_vigente_hasta || undefined,
    };

    try {
      if (clienteEditando) {
        const respuesta = await actualizarClienteApi(token, clienteEditando.id, payload);
        toast.success(`Cliente ${respuesta.cliente.razon_social} actualizado`);
      } else {
        const respuesta = await crearClienteApi(token, payload);
        toast.success(`Cliente ${respuesta.cliente.razon_social} creado`);
      }
      setForm(formularioInicial);
      setClienteEditando(null);
      setDrawerAbierto(false);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el cliente');
    } finally {
      setCreando(false);
    }
  }

  if (!token) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button className="btn-primary" onClick={abrirNuevo}>
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
                    <th className="py-2 pr-3">Tarifa</th>
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
                        <p>{cliente.tarifa_plan}</p>
                        {cliente.tarifa_precio_noche && (
                          <p className="text-xs">
                            {formatoMoneda(Number(cliente.tarifa_precio_noche))}
                          </p>
                        )}
                      </td>
                      <td className="py-3 pr-3 text-stone-light">
                        {cliente.numero_documento ?? '—'}
                      </td>
                      <td className="py-3 pr-3 text-right">
                        {formatoMoneda(Number(cliente.cupo_credito))}
                      </td>
                      <td className="py-3 pr-3 text-right">{cliente.dias_credito}</td>
                      <td className="py-3 text-right">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            className="rounded-lg border border-cream-dark px-2 py-1 text-xs text-stone-light hover:bg-cream"
                            onClick={() => abrirVer(cliente)}
                          >
                            Ver
                          </button>
                          <button
                            className="rounded-lg border border-gold/40 px-2 py-1 text-xs text-gold-dark"
                            onClick={() => abrirEditar(cliente)}
                          >
                            Editar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <SlideOver
          open={drawerAbierto}
          onClose={() => setDrawerAbierto(false)}
          title={clienteEditando ? 'Editar cliente' : 'Nuevo cliente'}
          subtitle="Datos de contacto, crédito y tarifa."
        >
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

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="direccion_cliente">Dirección</label>
                <input
                  id="direccion_cliente"
                  className="input"
                  value={form.direccion}
                  onChange={(event) => setForm({ ...form, direccion: event.target.value })}
                />
              </div>
              <div>
                <label className="label" htmlFor="ciudad_cliente">Ciudad</label>
                <input
                  id="ciudad_cliente"
                  className="input"
                  value={form.ciudad}
                  onChange={(event) => setForm({ ...form, ciudad: event.target.value })}
                />
              </div>
            </div>

            <div className="rounded-xl border border-gold/20 bg-cream-dark/40 p-3">
              <p className="text-sm font-semibold text-stone">Tarifa del cliente</p>
              <p className="mt-1 text-xs text-stone-light">
                Pública usa la matriz normal. Empresa, empleado o grupo usan el precio negociado.
              </p>

              <div className="mt-3">
                <label className="label" htmlFor="tarifa_plan">Plan de tarifa</label>
                <select
                  id="tarifa_plan"
                  className="input"
                  value={form.tarifa_plan}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      tarifa_plan: event.target.value as typeof form.tarifa_plan,
                    })
                  }
                >
                  <option value="PUBLICA">Pública</option>
                  <option value="EMPRESA">Empresa</option>
                  <option value="EMPLEADO">Empleado</option>
                  <option value="GRUPO">Grupo</option>
                </select>
              </div>

              {form.tarifa_plan !== 'PUBLICA' && (
                <>
                  <div className="mt-3">
                    <label className="label" htmlFor="tarifa_precio">Precio por noche</label>
                    <MoneyInput
                      id="tarifa_precio"
                      value={form.tarifa_precio_noche}
                      onChange={(value) => setForm({ ...form, tarifa_precio_noche: value })}
                    />
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="label" htmlFor="tarifa_desde">Vigente desde</label>
                      <input
                        id="tarifa_desde"
                        type="date"
                        className="input"
                        value={form.tarifa_vigente_desde}
                        onChange={(event) =>
                          setForm({ ...form, tarifa_vigente_desde: event.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="label" htmlFor="tarifa_hasta">Vigente hasta</label>
                      <input
                        id="tarifa_hasta"
                        type="date"
                        className="input"
                        value={form.tarifa_vigente_hasta}
                        onChange={(event) =>
                          setForm({ ...form, tarifa_vigente_hasta: event.target.value })
                        }
                      />
                    </div>
                  </div>
                  <label className="mt-3 flex items-center gap-2 text-sm text-stone">
                    <input
                      type="checkbox"
                      checked={form.tarifa_desayuno_incluido}
                      onChange={(event) =>
                        setForm({ ...form, tarifa_desayuno_incluido: event.target.checked })
                      }
                    />
                    Incluye desayuno
                  </label>
                </>
              )}
            </div>

            <div>
              <label className="label" htmlFor="notas_cliente">Notas</label>
              <textarea
                id="notas_cliente"
                className="input"
                rows={2}
                value={form.notas}
                onChange={(event) => setForm({ ...form, notas: event.target.value })}
              />
            </div>

            <button
              className="btn-primary w-full"
              onClick={() => void crear()}
              disabled={
                creando ||
                !form.razon_social.trim() ||
                (form.tarifa_plan !== 'PUBLICA' && Number(form.tarifa_precio_noche || 0) <= 0)
              }
            >
              {creando
                ? 'Guardando…'
                : clienteEditando
                  ? 'Guardar cambios'
                  : 'Crear cliente'}
            </button>
          </div>
        </section>
        </SlideOver>

        <SlideOver
          open={Boolean(clienteVer)}
          onClose={() => setClienteVer(null)}
          size="detail"
          title="Detalle del cliente"
          subtitle={clienteVer ? `${clienteVer.razon_social} · ${clienteVer.tipo}` : undefined}
        >
          {clienteVer && (
            <ClienteDetalleContenido
              clienteId={clienteVer.id}
              onClose={() => setClienteVer(null)}
            />
          )}
        </SlideOver>
      </div>
    </div>
  );
}
