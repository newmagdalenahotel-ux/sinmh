# SINMH — Sistema Integral New Magdalena Hotel

Sistema para reemplazar el SIMP (reservas y check-in) y las planillas de Excel (caja y bar), con una sola fuente de verdad para la operación del hotel.

**Estado:** Franja 0 en marcha. Backend con login JWT, health y base embebida funcionando. La primera versión es **recepción 24 horas**: alojamiento walk-in, reservas simples, folios, cobros, caja con turnos, bar recepción y roles.

## Documentos

- [SPEC.md](docs/SPEC.md) — alcance original de la Fase 1A (se está reescribiendo con los hallazgos).
- [procesos-operativos.md](docs/procesos-operativos.md) — cómo opera hoy el hotel.
- [datos-existentes.md](docs/datos-existentes.md) — qué hay en el SIMP y en las planillas, y cómo migrarlo.
- [tarifas.md](docs/tarifas.md) — matriz de precios, escenarios y temporadas.
- [inventario-habitaciones.md](docs/inventario-habitaciones.md) — habitaciones, capacidades y climatización.
- [decisiones.md](docs/decisiones.md) — decisiones de arquitectura y alcance.
- [design.md](docs/design.md) — esquema de base de datos propuesto.
- [design-system.md](docs/design-system.md) — identidad visual.

## Datos

- `seeds/habitaciones.csv` — inventario de habitaciones.
- `seeds/tarifas.csv` — matriz de precios.

Los archivos con datos personales (`datos y procesos/`) no se versionan.

## Backend

```bash
cd backend
npm install
npm run migrate
npm run seed
npm run dev
```

- API: `http://localhost:3000`
- Health: `GET /health`
- Login: `POST /auth/login` con `admin` / `admin123`
- Base: PostgreSQL embebido (PGlite) en `backend/.data`; el mismo esquema corre en PostgreSQL real.
- Los datos de `datos y procesos/` no se versionan.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

- URL: `http://127.0.0.1:5173`
- Login: `admin` / `admin123`
- Consume la API en `http://localhost:3000`.

## Todo desde la raíz

```bash
npm install
npm run dev
```

Levanta la API y la web al mismo tiempo con `concurrently`.

## Siguiente paso

Completar la Franja 0 con el frontend de login y el shell. Después, check-in walk-in con cobro, folio y cierre de caja.

## Repositorio remoto

Pendiente de crear y enlazar. El repositorio local ya está inicializado en `main`.
