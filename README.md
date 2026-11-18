# SINMH — Sistema Integral New Magdalena Hotel

Sistema para reemplazar el SIMP (reservas y check-in) y las planillas de Excel (caja y bar), con una sola fuente de verdad para la operación del hotel.

**Estado:** descubrimiento y planeación. La primera versión es **recepción 24 horas**: alojamiento walk-in, reservas simples, folios, cobros, caja con turnos, bar recepción y roles. El código arranca en la Franja 0.

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

## Siguiente paso

Franja 0: repositorio, PostgreSQL local, runner de migraciones, login y shell. Después, check-in walk-in con cobro y cierre de caja.

## Repositorio remoto

Pendiente de crear y enlazar. El repositorio local ya está inicializado en `main`.
