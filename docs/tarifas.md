# Tarifas y política de precios — Hotel New Magdalena

**Estado:** borrador validado con el dueño el 18-nov-2026. Pendiente confirmar el conteo de desayunos y algunos precios de empresa.
**Fuentes:** tabla del dueño, `bd_hpm.sql` (tarifas del SIMP) y SOP de check-in.

**Principio:** todos los precios son cerrados y redondos, para no tener que devolver monedas.

---

## 1. Inventario

- **33 espacios:** **31 habitaciones rentables + 103 bodega + Admin oficina**.
- **23 con A/C y 8 con ventilador:** 108, 205, 207, 209, 301, 303, 305, 405.
- La **105 es la suite** (dos espacios, dos baños, dos TV, dos A/C); hoy tiene 6 camas y se vende para 5 o 6, o como suite para 2.
- La **106 es quintuple** (máximo 5 personas), sin suite.
- La **climatización es dinámica**: si se repara el A/C se vende como A/C; si se pone un ventilador en una de A/C y se baja el taco, se cobra como ventilador.
- La tarifa depende de **climatización vendida + pax + temporada + escenario**.
- Ver `inventario-habitaciones.md` y `seeds/habitaciones.csv`.

## 2. Temporadas

- **Base:** baja; alta en festivos y del **15 de diciembre al 15 de enero**.
- **El admin ajusta cada día**: si el festivo está flojo, lo pasa a baja; si ve demanda, lo deja alto.
- **Regla de ejemplo, configurable:**
  - A las **3 pm** se mira la ocupación.
  - Si hay **15 habitaciones ocupadas o menos**, el día va en **baja** y se habilitan A/B/C.
  - Si se llega a **15 habitaciones**, se activa la **alta para las siguientes** y se cierran los descuentos, salvo autorización.
  - El sistema sugiere y **el admin confirma**.
- **Ejemplo con 31 habitaciones rentables:**

| Ocupadas a las 3 pm | Temporada | 2 pax A/C | Descuentos |
|---:|---|---:|---|
| 10 | Baja | 130.000 | Sí |
| 14 | Baja | 130.000 | Sí |
| 15 | La que llega a 15 paga baja; las siguientes, alta | 130.000 / 180.000 | No desde la 16 |
| 16 o más | Alta | 180.000 | No |

- Si un **grupo** hace cruzar el umbral, se le respeta la tarifa vigente al momento de la cotización; la alta aplica a las ventas siguientes.
- `[C]` **Confirmado:** el umbral es de **15 habitaciones**. Se revisa a las 6 u 8 semanas con ocupación, ADR y RevPAR.
- El calendario vive en una tabla de fechas, no en el código.

## 3. Escenarios y reglas de descuento

| Escenario | Condición | Descuento nominal |
|---|---|---|
| Normal | tarifa de lista | 0 % |
| A | llegada después de las **7:30 pm** | 15 % |
| B | estadía de **2 o más noches** | 15 % |
| C | grupo o varias habitaciones | 10 % |

**Reglas confirmadas por el dueño (18-nov-2026):**

1. **A:** llegada después de las 7:30 pm; el 15 % se aplica a **todas las noches**.
2. **B:** 2, 3, 4 o más noches; el 15 % se aplica a **todas las noches**. Ejemplo: 3 noches de 130.000 = **330.000**.
3. **C:** grupo o varias habitaciones; el 10 % se aplica a todas las noches. **Si el grupo no acepta, se le ofrece B (15 %) para cerrar.**
4. **Orden de venta:** si llega tarde y se queda varias noches, **primero B**; si no acepta, **A** para que se quede. **C no se usa para retener** a un cliente de una sola habitación que llega tarde.
5. **No ofrecer descuento de entrada.** Solo si el cliente insiste, demuestra intención real de quedarse y la **ocupación del día es de 15 habitaciones o menos** (SOP).
6. Las habitaciones con **ventilador no tienen ningún descuento**, ni por llegada tarde, ni por estadía, ni por grupo.
7. **Descuento manual** solo con motivo y autorización; queda registrado.
8. **A, B y C no se acumulan**; se elige uno.
9. **La tarifa es por pax**, no por habitación. Una triple vendida para 1 se cobra como sencilla; para 2, como doble; para 3, como triple. Igual para 105, 109, 208 y 403. La suite 105 es la excepción: se cobra como sextuple aunque vaya para 2.

## 4. A/C — Temporada baja

| Acomodación | Normal | A | B | C |
|---:|---:|---:|---:|---:|
| 1 persona | 90.000 | 75.000 | 75.000 | 80.000 |
| 2 personas | 130.000 | 110.000 | 110.000 | 115.000 |
| 3 personas | 170.000 | 145.000 | 145.000 | 155.000 |
| 4 personas | 210.000 | 180.000 | 180.000 | 190.000 |
| 5 personas | 250.000 | 210.000 | 210.000 | 225.000 |
| 6 personas / suite | 290.000 | 250.000 | 250.000 | 260.000 |

**Confirmado:** 2 personas en temporada baja cuesta **130.000** y en alta **180.000**. El SIMP tenía 125.000 desactualizado.

## 5. A/C — Temporada alta

| Acomodación | Normal | A | B | C |
|---:|---:|---:|---:|---:|
| 1 persona | 130.000 | 110.000 | 110.000 | 115.000 |
| 2 personas | 180.000 | 155.000 | 155.000 | 160.000 |
| 3 personas | 240.000 | 205.000 | 205.000 | 215.000 |
| 4 personas | 300.000 | 255.000 | 255.000 | 270.000 |
| 5 personas | 360.000 | 305.000 | 305.000 | 325.000 |
| 6 personas / suite | 400.000 | 345.000 | 345.000 | 360.000 |

## 6. Sextuple y suite (105)

- La **105** es la suite: dos espacios, dos baños, dos TV y dos A/C. Hoy tiene 6 camas; se vende para **5 o 6**.
- Si piden suite, se arregla: un espacio con cama y el otro con sofá, comedor y nevera.
- **La suite se vende para 2 personas y se cobra como sextuple**, aunque vayan 2.
- La **106 es quintuple**: máximo 5 personas, sin suite.
- Precios: **290.000 / 400.000** normal, **250.000 / 345.000** con A o B, **260.000 / 360.000** con C.
- Son precios cerrados, sin monedas. `[C]` confirmar.

## 7. Desayuno

- **Precio: 15.000 por desayuno por persona.** Queda así por decisión del dueño; el IVA o impoconsumo queda pendiente por confirmar con el contador.
- **Se suma al valor de la noche, por pax.** Ejemplo: 2 personas = 30.000 por noche; 3 noches = 90.000.
- Las tarifas públicas **no incluyen desayuno**: si el huésped lo pide, se suma.
- Si la **tarifa de empresa ya lo incluye**, **no se suma** a la noche; va dentro del convenio. La tarifa negociada debe cubrir el costo de 12.000.
- Si la tarifa de empresa **no lo incluye**, se suma como cualquier adicional.
- Cantidad: **pax × noches**.
- **Incluido y no consumido:** no se devuelve.
- **Pagado y no consumido:** no se devuelve automáticamente; el admin puede anular con motivo y autorización.
- **Reporte diario para cocina:** habitación, pax, incluido o pagado, total.
- `[C]` Si el 15.000 termina siendo con impuesto incluido, revisar el margen: el neto sería 12.605 y el costo 12.000. El contador debe decir si va con IVA 19 % o impoconsumo 8 %.

## 8. Habitaciones con ventilador

| Acomodación | Tarifa única | Descuentos |
|---:|---:|---|
| 1 persona | 50.000 | No aplica ninguno |
| 2 personas | 80.000 | No aplica ninguno |

- `[C]` Capacidad máxima de las 8 y si existe tarifa para 3 o más.

## 9. Tarifas corporativas y convenios

El SIMP ya maneja **tarifas por empresa**, distintas de la matriz pública:

- Por empresa: Chemicals 80.000, Eiatec 80.000, BDB 60.000, Novomet 148.000, Rosen 120.000, OMIA 147.500, Borets 75.000, Aviatur 170.000, Smartstar 90.000.
- Genéricas: ventilador sin parqueadero 55.000, ventilador con parqueadero 60.000, A/C sin parqueadero 75.000, A/C con parqueadero 80.000 (1 persona); 85.000 / 90.000 / 105.000 / 110.000 para 2 personas.
- **El parqueadero cambia el precio.**
- El convenio incluye tarifa, **plazo de pago** (8, 15 o 30 días), **cupo configurable** y **si incluye desayuno o no**.

**Conclusión:** el modelo necesita `convenio_tarifa` por cliente/empresa, no solo la matriz pública.

## 10. Impuestos y documentos

- A las empresas o a quien pida **factura electrónica** se le suma **19 %**.
- `[C]` Si la lista es con IVA incluido o sin IVA.
- `[C]` **Bar:** en Colombia normalmente maneja impoconsumo del 8 %, no IVA del 19 %. Confirmar con el contador.
- `[C]` El hotel ya emite factura electrónica. Falta NIT, régimen, resolución y proveedor.
- Explicación simple de IVA e impoconsumo en [impuestos.md](impuestos.md).
- **Impresoras:** por ahora solo **Kyocera láser en hoja grande (carta u oficio)**. La térmica para tirilla queda para después.

## 11. Reglas de estadía

- **Check-in 3 pm, check-out 1 pm.**
- Entrada desde las **12 pm sin cobro**; antes de las 12 se cobra por horas.
- Salida con tolerancia de **1 o 2 horas**; después se cobra adicional.
- **Empresas** pueden entrar temprano `[C]`.
- **Huésped adicional:** se pasa a la tarifa de la nueva acomodación `[C]` si se cobra completa o solo la diferencia.
- **Extensión:** una noche más, con saldo pendiente. `[C]` si la 4ta noche vuelve a normal.
- **Cambio de misma categoría:** sin recargo.
- **Mensualidad:** prepagada, con contrato impreso distinto al registro de hospedaje.
- **Reservas:** abono 50 %, sin devolución, reprogramable `[C]` condiciones.

## 12. Modelo de datos propuesto

```sql
temporada(id, codigo, nombre)
temporada_fecha(id, temporada_id, desde, hasta)
tarifa(id, tipo_habitacion_id, temporada_id, acomodacion, escenario, valor, incluye_desayuno)
convenio_tarifa(id, cliente_id, tipo_habitacion_id, acomodacion, valor, dias_credito, cupo, incluye_desayuno)
reserva(..., incluye_desayuno, desayunos_pax, desayunos_total)
configuracion(clave='desayuno_costo', valor='12000')
configuracion(clave='desayuno_precio', valor='15000')
configuracion(clave='desayuno_impuesto', valor='POR_CONFIRMAR')
```

- `acomodacion`: 1 a 6.
- `escenario`: `NORMAL`, `A`, `B`, `C`.
- El cargo guarda `tarifa_id`, `precio_lista` y `precio_cobrado`.
- El convenio guarda tarifa, plazo, cupo y desayuno.
- La suite 105 usa la tarifa de 6 personas.
- El desayuno puede ir incluido en la tarifa o cobrarse como cargo.

## 13. Pendientes

1. Confirmar **290.000 / 400.000** para sextuple y suite de la 105, y sus descuentos.
2. Confirmar **IVA 19 % o impoconsumo 8 %** del desayuno de 15.000 (pendiente con el contador).
3. IVA incluido o adicional; bar impoconsumo; datos de facturación.
4. Modelo de la **Kyocera** y tamaño de hoja.
