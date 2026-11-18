# Datos existentes — SIMP y planillas Excel

**Estado:** análisis del 18-nov-2026, solo lectura. No se modificó ninguna base ni planilla.
**Fuentes:** `datos y procesos/bd_hpm.sql` (MySQL, 5.490 líneas), `Planilla de Caja.xlsx`, `Planilla bar NN.xlsx`, `Consolidado Mensual.xlsx`.

---

## 1. Qué es el sistema actual

- Dump de **MySQL** (phpMyAdmin, InnoDB, utf8) de la aplicación **SIMP** que corre en `http://localhost/sipm/recepcion/gestionalojamiento`.
- **42 tablas** y these volúmenes:

| Tabla | Filas |
|---|---:|
| reservas | 523 |
| pagos | 609 |
| clientes | 392 |
| empresas | 51 |
| habitaciones | 32 |
| tarifas | 982 |
| productos | 291 |
| servicios | 31 |
| caja (cierres diarios) | 149 |
| minuta (turnos) | 151 |
| cuentas_por_cobrar | 10 |
| abonos CxC | 0 |
| egresos | 192 |
| ingresos | 13 |
| acompañantes | 20 |

- Funciones que sí tiene: reservas, acompañantes, pagos, cuentas por cobrar, habitaciones y estados, tarifas, productos, servicios, caja diaria, minuta de turno, usuarios y roles.
- Funciones que **no** tiene: contabilidad de doble partida, arqueo por turno con responsable y diferencia, proveedores y compras, inventario real (`inventario` vacía), eventos, propinas, facturación electrónica, auditoría, adjuntos en archivos (los guarda como BLOB).

## 2. Habitaciones

- **32 registros**, no 33. De ellos, **31 rentables + 1 "Admin"** (fuera de servicio).
- Distribución: 20 dobles (19 rentables + Admin), 6 triples, 3 quíntuples, 1 séxtuple, 1 cuádruple, 1 sencilla.
- Números: 104–111, 201–210, 301–308, 401–405 y "Admin". **Falta el 103** (el id 1 no existe en la tabla).
- **No hay suite registrada**, aunque la acomodación "Suite" existe en el catálogo.
- **No hay atributo de A/C vs ventilador**: los 7 con ventilador no se pueden identificar desde la base. En los Excel aparecen 207 y 303 como ventilador, pero es evidencia parcial.

**Conclusión:** hay que definir el inventario real antes de cargar: si son 33, cuál es la faltante, cuál es la suite y cuáles son las 7 de ventilador.

## 3. Tarifas

- 982 filas, de las cuales **943 son "Personalizada"** con `paxs=0`: basura acumulada, no se migra.
- **22 tarifas corporativas**:
  - Por empresa: Chemicals 80.000, Eiatec 80.000, BDB 60.000, Novomet 148.000, Rosen 120.000, OMIA 147.500, Borets 75.000, Aviatur 170.000, Smartstar 90.000, entre otras.
  - Genéricas por atributo: "Solo Ventilador (sin parqueadero)" 55.000, "Ventilador + Parqueadero" 60.000, "Con Aire Acond. (sin parqueadero)" 75.000, "Aire Acond. + Parqueadero" 80.000; para 2 personas: 85.000 / 90.000 / 105.000 / 110.000.
- **Matriz pública**: 5 filas "Temporada Baja" y 5 "Temporada Alta". Coinciden con la tabla del dueño, salvo que la base tiene **125.000** en 2 personas temporada baja y la tarifa vigente confirmada es **130.000**; la base está desactualizada.
- 1 tarifa "Rato" de 70.000 para 2 personas.

**Conclusión:** el precio corporativo es un **convenio por empresa**, no la matriz pública; y el parqueadero es un atributo que cambia el precio. Hay que modelarlo aparte.

## 4. Reservas y pagos

- 523 reservas: **504 check-out, 10 in-house, 8 canceladas, 1 reservada**.
- 371 de 1 noche, 109 de 2, 21 de 3. Seis estancias largas de 76 a 154 noches: son mensualidades.
- 609 pagos por **98.471.964**: 343 efectivo, 205 transferencia, 47 tarjeta débito, 14 tarjeta crédito.
- Total de reservas: **111.543.044**; saldo acumulado: **11.311.100**.
- Pero solo **10 cuentas por cobrar por 3.500.000**, y **0 abonos**. Además, **6.329.000 de saldo está en reservas ya cerradas** y 2.932.100 en canceladas.

**Conclusión:** los saldos del SIMP no son confiables. Antes de migrar hay que recalcular pagado vs total y decidir qué saldos reales se convierten en cuenta por cobrar.

## 5. Caja

- 149 cierres diarios, pero `caja_total` llega a **41.624.049** y `caja_inicial` repite el cierre anterior. **No es efectivo en caja: es un acumulado.**
- La **minuta** tiene 151 turnos con responsable, reservas, in-house y efectivo. Ese efectivo **sí coincide con el "saldo inicial" de la planilla Excel**: 18-nov, 1.751.100.
- La planilla de caja es la fuente real: apertura a las 6 am, ingresos por turno (1, 2, 3), habitación o servicio, efectivo/tarjeta/transferencia, egresos con NIT/CC, subtotales y cierre diario.

**Conclusión:** no migrar la caja del SIMP como saldo. Se toma el último cierre de la planilla como corte inicial y se arranca desde ahí.

## 6. Bar

- Está **fuera del SIMP**: `reserva_productos` vacía y las ventas no aparecen en `pagos`.
- Todo vive en `Planilla bar NN.xlsx`: 211 productos, 1.138 salidas, créditos CR-001 a CR-010, ventas por 9.271.600 y 435.000 por cobrar.
- Maneja costo, precio hotel, precio afuera, entradas, salidas y existencia.
- La pestaña de ganancias muestra 3.943,75, que parece un error de fórmula: las ganancias reales son millones.

**Conclusión:** si el bar recepción entra en la v1, hay que integrar ventas y créditos, y decidir si también el inventario.

## 7. Servicios y productos

- 31 servicios, entre ellos: piscina (entradas de 15.000 y eventos privados de 150.000 a 360.000), lavandería, auditorio por hora 100.000, gimnasio, ping pong, baño turco, **adicional pax 35.000**, **adicional pax A/C 50.000** y **noche adicional 140.000**.
- 291 productos en 7 categorías: bebidas alcohólicas y sin alcohol, dulces, lácteos, droguería, cigarrillos, aperitivos y otros.

**Conclusión:** el catálogo de venta rápida ya existe; sirve para la recepción y para el bar.

## 8. Problemas de datos que hay que resolver

1. 943 tarifas "Personalizada" inservibles.
2. Saldos de reservas que no cuadran con pagos ni con CxC.
3. Caja acumulada, sin arqueo por turno confiable.
4. Adjuntos en BLOB dentro de la base.
5. Sin atributo A/C/ventilador y sin suite.
6. Fechas `0000-00-00` en CxC.
7. `pagos`, `pago_pagado` y `saldo_reserva` son tres fuentes para el mismo dinero.
8. Contraseñas PHP `$2y$`: hay que recrear usuarios o forzar cambio.
9. Productos duplicados entre la base (291) y el Excel del bar (211).
10. `clientes_gimnasio`, `pagos_gimnasio` e `inventario` vacías: módulos sin uso.

## 9. Estrategia de migración propuesta

- **Maestros:** habitaciones (con A/C, ventilador, suite y capacidad), clientes, empresas, convenios y tarifas corporativas, servicios y productos.
- **Histórico:** importar las 523 reservas y 609 pagos completos como solo lectura, con `legacy_id`, para reportes y cartera. Es un volumen pequeño.
- **No importar:** tarifas "Personalizada", la caja acumulada ni los anexos BLOB.
- **Saldos:** recalcular con pagos; convertir a cuenta por cobrar solo los saldos abiertos que el dueño confirme.
- **Caja:** corte inicial acordado con el último cierre de la planilla.
- **Bar:** migrar productos y créditos abiertos; el historial de ventas es opcional.
- **Validación:** comparar totales mensuales contra el Consolidado Mensual: junio 26,1 M; julio 20,4 M; agosto 29,1 M; septiembre 23,3 M; octubre 23,2 M; noviembre 15,1 M (parcial).

## 10. Decisiones pendientes

1. Inventario real: 33 vs 32, la habitación 103, la suite y las 7 de ventilador.
2. ¿Reemplazar el SIMP o convivir? Recomendación: reemplazo por franjas y SIMP en solo lectura.
3. ¿Migrar todo el histórico o solo abierto y últimos seis meses?
4. ¿El bar en v1 incluye inventario o solo ventas y créditos?
5. ¿Cuál es el umbral de ocupación para temporada alta?
6. ¿Los saldos viejos se cobran o se condonan?
