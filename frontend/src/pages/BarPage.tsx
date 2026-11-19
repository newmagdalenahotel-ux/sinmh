import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useToast } from '../components/Toast';
import {
  foliosApi,
  productosApi,
  sesionActualApi,
  venderBarApi,
  ventasBarApi,
  type FolioResumen,
  type Producto,
  type VentaBar,
} from '../lib/api';

function formatoMoneda(valor: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(valor);
}

function formatoFechaHora(valor: string) {
  return new Intl.DateTimeFormat('es-CO', { dateStyle: 'short', timeStyle: 'short' }).format(
    new Date(valor)
  );
}

type CarritoItem = { producto: Producto; cantidad: number };

export function BarPage() {
  const { token } = useAuth();
  const toast = useToast();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [ventas, setVentas] = useState<VentaBar[]>([]);
  const [folios, setFolios] = useState<FolioResumen[]>([]);
  const [carrito, setCarrito] = useState<CarritoItem[]>([]);
  const [metodoPago, setMetodoPago] = useState<
    'EFECTIVO' | 'TARJETA' | 'TRANSFERENCIA' | 'CARGO_HABITACION'
  >('EFECTIVO');
  const [tipoDocumento, setTipoDocumento] = useState<
    'NINGUNO' | 'RECIBO_CAJA' | 'FACTURA_ELECTRONICA'
  >('NINGUNO');
  const [folioId, setFolioId] = useState('');
  const [notas, setNotas] = useState('');
  const [cajaAbierta, setCajaAbierta] = useState<boolean | null>(null);
  const [cargando, setCargando] = useState(true);
  const [vendiendo, setVendiendo] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token) void cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function cargar() {
    if (!token) return;
    setCargando(true);
    setError('');

    try {
      const [respuestaProductos, respuestaVentas, respuestaFolios, respuestaCaja] =
        await Promise.all([
          productosApi(token),
          ventasBarApi(token),
          foliosApi(token),
          sesionActualApi(token),
        ]);

      setProductos(respuestaProductos.productos);
      setVentas(respuestaVentas.ventas);
      setFolios(respuestaFolios.folios);
      setCajaAbierta(Boolean(respuestaCaja.sesion));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cargar el bar');
    } finally {
      setCargando(false);
    }
  }

  function agregar(producto: Producto) {
    setError('');
    const existente = carrito.find((item) => item.producto.id === producto.id);

    if (existente) {
      if (existente.cantidad + 1 > Number(producto.stock)) {
        setError(`No hay más stock de ${producto.nombre}`);
        return;
      }
      setCarrito(
        carrito.map((item) =>
          item.producto.id === producto.id ? { ...item, cantidad: item.cantidad + 1 } : item
        )
      );
      return;
    }

    if (Number(producto.stock) < 1) {
      setError(`No hay stock de ${producto.nombre}`);
      return;
    }

    setCarrito([...carrito, { producto, cantidad: 1 }]);
  }

  function cambiarCantidad(productoId: number, delta: number) {
    setCarrito(
      carrito
        .map((item) =>
          item.producto.id === productoId
            ? { ...item, cantidad: item.cantidad + delta }
            : item
        )
        .filter((item) => item.cantidad > 0)
    );
  }

  const total = carrito.reduce(
    (suma, item) => suma + Number(item.producto.precio_venta) * item.cantidad,
    0
  );

  async function vender() {
    if (!token) return;

    if (carrito.length === 0) {
      setError('Agrega al menos un producto');
      return;
    }

    if (metodoPago === 'CARGO_HABITACION' && !folioId) {
      setError('Selecciona el folio al que se carga la venta');
      return;
    }

    setVendiendo(true);
    setError('');

    try {
      const respuesta = await venderBarApi(token, {
        items: carrito.map((item) => ({
          producto_id: item.producto.id,
          cantidad: item.cantidad,
        })),
        metodo_pago: metodoPago,
        tipo_documento: tipoDocumento,
        folio_id: metodoPago === 'CARGO_HABITACION' ? Number(folioId) : undefined,
        notas: notas.trim() || undefined,
      });

      toast.success(
        `Venta #${respuesta.venta.ventaId} por ${formatoMoneda(respuesta.venta.total)} · ${respuesta.venta.estado}`
      );
      setCarrito([]);
      setFolioId('');
      setNotas('');
      setMetodoPago('EFECTIVO');
      setTipoDocumento('NINGUNO');
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo registrar la venta');
    } finally {
      setVendiendo(false);
    }
  }

  if (!token) return null;

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Link to="/folios" className="btn-primary">Ver huéspedes</Link>
      </div>

      {error && <div className="rounded-xl bg-error/10 px-4 py-3 text-sm text-error">{error}</div>}
      {cajaAbierta === false && (
        <div className="rounded-xl bg-warning/10 px-4 py-3 text-sm text-warning">
          No hay caja abierta. Para vender en efectivo, <Link to="/caja" className="font-semibold underline">abre la caja</Link>.
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="card">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl text-stone">Productos</h2>
            <span className="text-xs text-stone-light">{productos.length}</span>
          </div>

          {cargando ? (
            <p className="mt-4 text-sm text-stone-light">Cargando…</p>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {productos
                .filter((producto) => producto.activo)
                .map((producto) => (
                  <button
                    key={producto.id}
                    type="button"
                    onClick={() => agregar(producto)}
                    className="rounded-xl border border-cream-dark bg-white p-3 text-left transition hover:border-gold/60"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-stone">{producto.nombre}</p>
                      <span className="text-sm font-semibold text-gold-dark">
                        {formatoMoneda(Number(producto.precio_venta))}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-stone-light">
                      {producto.categoria ?? 'Sin categoría'} · stock {Number(producto.stock)}
                    </p>
                  </button>
                ))}
            </div>
          )}
        </section>

        <div className="space-y-6">
          <section className="card">
            <h2 className="font-display text-xl text-stone">Venta</h2>

            {carrito.length === 0 ? (
              <p className="mt-3 text-sm text-stone-light">Agrega productos del catálogo.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {carrito.map((item) => (
                  <div key={item.producto.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="flex-1">{item.producto.nombre}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="h-7 w-7 rounded-lg border border-cream-dark"
                        onClick={() => cambiarCantidad(item.producto.id, -1)}
                      >
                        -
                      </button>
                      <span>{item.cantidad}</span>
                      <button
                        type="button"
                        className="h-7 w-7 rounded-lg border border-cream-dark"
                        onClick={() => cambiarCantidad(item.producto.id, 1)}
                      >
                        +
                      </button>
                    </div>
                    <span className="w-24 text-right font-medium">
                      {formatoMoneda(Number(item.producto.precio_venta) * item.cantidad)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="metodo_pago">Método</label>
                <select
                  id="metodo_pago"
                  className="input"
                  value={metodoPago}
                  onChange={(event) =>
                    setMetodoPago(
                      event.target.value as
                        | 'EFECTIVO'
                        | 'TARJETA'
                        | 'TRANSFERENCIA'
                        | 'CARGO_HABITACION'
                    )
                  }
                >
                  <option value="EFECTIVO">Efectivo</option>
                  <option value="TARJETA">Tarjeta</option>
                  <option value="TRANSFERENCIA">Transferencia</option>
                  <option value="CARGO_HABITACION">Cargo a habitación</option>
                </select>
              </div>
              <div>
                <label className="label" htmlFor="tipo_documento">Documento</label>
                <select
                  id="tipo_documento"
                  className="input"
                  value={tipoDocumento}
                  onChange={(event) =>
                    setTipoDocumento(
                      event.target.value as 'NINGUNO' | 'RECIBO_CAJA' | 'FACTURA_ELECTRONICA'
                    )
                  }
                >
                  <option value="NINGUNO">Ninguno</option>
                  <option value="RECIBO_CAJA">Recibo de caja</option>
                  <option value="FACTURA_ELECTRONICA">Factura electrónica</option>
                </select>
              </div>
            </div>

            {metodoPago === 'CARGO_HABITACION' && (
              <div className="mt-3">
                <label className="label" htmlFor="folio_id">Folio / habitación</label>
                <select
                  id="folio_id"
                  className="input"
                  value={folioId}
                  onChange={(event) => setFolioId(event.target.value)}
                >
                  <option value="">Selecciona un folio</option>
                  {folios.map((folio) => (
                    <option key={folio.id} value={folio.id}>
                      Hab. {folio.habitacion} · {folio.huesped ?? 'Sin titular'} · {folio.codigo}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="mt-3">
              <label className="label" htmlFor="notas">Notas</label>
              <input
                id="notas"
                className="input"
                value={notas}
                onChange={(event) => setNotas(event.target.value)}
              />
            </div>

            <div className="mt-4 flex items-center justify-between gap-3 border-t border-cream-dark pt-3">
              <span className="text-sm text-stone-light">Total</span>
              <span className="text-lg font-semibold">{formatoMoneda(total)}</span>
            </div>

            <button
              className="btn-primary mt-3 w-full"
              onClick={() => void vender()}
              disabled={vendiendo || carrito.length === 0}
            >
              {vendiendo ? 'Registrando…' : 'Registrar venta'}
            </button>
          </section>

          <section className="card">
            <h2 className="font-display text-xl text-stone">Últimas ventas</h2>

            {ventas.length === 0 ? (
              <p className="mt-3 text-sm text-stone-light">No hay ventas registradas.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-cream-dark uppercase tracking-wide text-stone-light">
                      <th className="py-2 pr-2">Venta</th>
                      <th className="py-2 pr-2">Método</th>
                      <th className="py-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ventas.slice(0, 8).map((venta) => (
                      <tr key={venta.id} className="border-b border-cream-dark/60">
                        <td className="py-2 pr-2">
                          <p className="font-medium">#{venta.id}</p>
                          <p className="text-[10px] text-stone-light">{formatoFechaHora(venta.fecha)}</p>
                        </td>
                        <td className="py-2 pr-2 text-stone-light">{venta.metodo_pago}</td>
                        <td className="py-2 text-right font-medium">
                          {formatoMoneda(Number(venta.total))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
