import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

type SlideOverProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  size?: 'form' | 'detail';
  children: ReactNode;
};

function IconoAtras() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M19 12H5" />
      <path d="m12 19-7-7 7-7" />
    </svg>
  );
}

export function SlideOver({
  open,
  onClose,
  title,
  subtitle,
  size = 'form',
  children,
}: SlideOverProps) {
  useEffect(() => {
    if (!open) return;

    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const cerrarConEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', cerrarConEscape);

    return () => {
      document.body.style.overflow = overflowAnterior;
      window.removeEventListener('keydown', cerrarConEscape);
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100]" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        aria-label="Cerrar panel"
        className="absolute inset-0 h-full w-full bg-navy-dark/55 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <section className="fixed inset-y-0 right-0 z-[101] flex h-dvh w-full flex-col bg-cream shadow-2xl animate-slide-over sm:w-[70vw] sm:max-w-[1280px]">
        <header className="flex items-start justify-between gap-4 border-b border-cream-dark bg-white/70 px-4 py-4 sm:px-6">
          <div className="flex min-w-0 items-start gap-3">
            <button
              type="button"
              onClick={onClose}
              aria-label="Volver"
              className="mt-0.5 rounded-lg p-1.5 text-stone-light transition hover:bg-cream hover:text-navy"
            >
              <IconoAtras />
            </button>
            <div className="min-w-0">
              <p className="truncate text-lg font-semibold text-stone">{title}</p>
              {subtitle && <p className="truncate text-xs text-stone-light">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-cream-dark px-3 py-1.5 text-xs text-stone-light transition hover:bg-cream"
          >
            Cerrar
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          <div className={`mx-auto w-full ${size === 'detail' ? 'max-w-6xl' : 'max-w-3xl'}`}>
            {children}
          </div>
        </div>
      </section>
    </div>,
    document.body
  );
}
