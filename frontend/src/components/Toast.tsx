import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

type TipoToast = 'success' | 'error' | 'info' | 'warning';

type Toast = {
  id: number;
  tipo: TipoToast;
  mensaje: string;
};

type ToastContexto = {
  mostrar: (tipo: TipoToast, mensaje: string) => void;
};

const ToastContext = createContext<ToastContexto | null>(null);

const estilos: Record<TipoToast, string> = {
  success: 'border-success/40 bg-success/10 text-success',
  error: 'border-error/40 bg-error/10 text-error',
  warning: 'border-warning/40 bg-warning/10 text-warning',
  info: 'border-info/40 bg-info/10 text-info',
};

const duraciones: Record<TipoToast, number> = {
  success: 4000,
  info: 5000,
  warning: 6000,
  error: 8000,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timers = useRef(new Map<number, number>());

  const cerrar = useCallback((id: number) => {
    setToasts((actuales) => actuales.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const mostrar = useCallback(
    (tipo: TipoToast, mensaje: string) => {
      const id = Date.now() + Math.random();
      setToasts((actuales) => [...actuales, { id, tipo, mensaje }]);

      const timer = window.setTimeout(() => cerrar(id), duraciones[tipo]);
      timers.current.set(id, timer);
    },
    [cerrar]
  );

  useEffect(() => {
    const timersActuales = timers.current;
    return () => {
      timersActuales.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  return (
    <ToastContext.Provider value={{ mostrar }}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-[70] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2"
        role="status"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm shadow-lg ${estilos[toast.tipo]}`}
          >
            <p>{toast.mensaje}</p>
            <button
              type="button"
              onClick={() => cerrar(toast.id)}
              className="text-current opacity-60 transition hover:opacity-100"
              aria-label="Cerrar notificación"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const contexto = useContext(ToastContext);
  if (!contexto) throw new Error('useToast debe usarse dentro de ToastProvider');

  return {
    success: (mensaje: string) => contexto.mostrar('success', mensaje),
    error: (mensaje: string) => contexto.mostrar('error', mensaje),
    warning: (mensaje: string) => contexto.mostrar('warning', mensaje),
    info: (mensaje: string) => contexto.mostrar('info', mensaje),
  };
}
