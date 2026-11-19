import type { ReactNode } from 'react';

type RecordLayoutProps = {
  children: ReactNode;
  sidebar: ReactNode;
};

/**
 * Layout de detalle: contenido principal ancho y panel derecho fijo.
 * En pantallas pequeñas el panel baja debajo del contenido.
 */
export function RecordLayout({ children, sidebar }: RecordLayoutProps) {
  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
      <div className="min-w-0 space-y-6">{children}</div>
      <aside className="space-y-6 self-start xl:sticky xl:top-6">{sidebar}</aside>
    </div>
  );
}
