# Tarifas y política de precios — Hotel New Magdalena

**Estado:** borrador validado con el dueño el 18-nov-2026. Pendiente: suite, inventario real y confirmación de las reglas marcadas `[C]`.
**Fuentes:** tabla del dueño, `bd_hpm.sql` (tarifas del SIMP) y SOP de check-in.

---

## 1. Inventario

- **33 espacios** si se confirma la 206: **31 habitaciones rentables + 103 bodega + Admin oficina**. La lista del dueño tiene 30 habitaciones y no incluye la 206.
- **22 con A/C y 8 con ventilador** según la lista; el dueño había dicho 7. `[C]` cuál no cuenta.
- La **suite es la 105** configurada como suite; también puede ser quintuple o sextuple. `[C]` falta la tarifa de 6 personas y de suite.
- La **climatización es dinámica**: si se repara el A/C se vende como A/C; si se pone un ventilador en una habitación de A/C y se baja el taco, se cobra como ventilador.
- La tarifa depende de **climatización vendida + acomodación + temporada + escenario**.
- Ver `inventario-habitaciones.md` y `seeds/habitaciones.csv`.

## 2. Temporadas y decisión diaria

- **Base:** tarifa baja; alta en festivos y del **15 de diciembre al 15 de enero**.
- **El admin ajusta cada día**: si el festivo está flojo, lo pasa a baja; si ve demanda, lo deja alto.
- **Regla propuesta para no quedar solos en un festivo malo:**
  - A las **3 pm** se mira la ocupación. Si hay **15 habitaciones ocupadas o menos**, el día se maneja en **baja** y se habilitan A/B/C.
  - Si hay **más de 15**, se mantiene **alta** y no se ofrecen descuentos salvo autorización.
  - El sistema muestra la ocupación y sugiere; **el admin confirma**.
- `[C]` El umbral de 15 es el mismo del SOP; confirmar.
- `[C]` Alternativa de ingreso: las primeras 15 habitaciones a baja y de la 16 en adelante a alta. Es más rentable, pero el precio cambia durante el día.
- El calendario vive en una tabla de fechas, no en el código.

## 3. Escenarios y reglas de descuento

| Escenario | Condición | Descuento nominal |
|---|---|---|
| Normal | tarifa de lista | 0 % |
| A | llegada después de las **7:30 pm** | 15 % |
| B | estadía de **2 o más noches** | 15 % |
| C | varias habitaciones o varias noches, grupo o regateo | 10 % |

**Reglas confirmadas por el dueño (18-nov-2026):**

1. **Escenario A:** llegada después de las 7:30 pm; el 15 % se aplica a **todas las noches** de la estadía.
2. **Escenario B:** si se quedan **2, 3, 4 o más noches**, el 15 % se aplica **a todas las noches**. Confirmado con ejemplo: 3 noches de 130.000 = **330.000** con B.
3. **Escenario C:** si vienen varias habitaciones o se quedan varias noches, el 10 % se aplica a todas las noches. Si además llegan después de las 7:30 y hay buen movimiento, se les puede ofrecer el 15 % de A.
4. **Orden de venta:** si llega tarde y se queda varias noches, **primero B**; si no acepta, **A** para que se quede. **C no se usa para retener** a un cliente de una sola habitación que llega tarde.
5. **No ofrecer descuento de entrada.** Solo si el cliente insiste, demuestra intención real de quedarse y la **ocupación del día es de 15 habitaciones o menos** (SOP).
6. Las habitaciones con **ventilador no tienen ningún descuento**, ni por llegada tarde, ni por estadía, ni por grupo.
7. **Descuento manual** solo con motivo y autorización; queda registrado.
8. **A, B y C no se acumulan**; se elige uno.

**El porcentaje es nominal, no exacto.** Los precios están redondeados a cifras comerciales:

- 90.000 → 75.000 es 16,7 %.
- 130.000 → 115.000 es 11,5 %.
- 170.000 → 155.000 es 8,8 %.
- 210.000 → 190.000 es 9,5 %.

Por eso el sistema **guarda el precio final** de cada combinación y no calcula el porcentaje.

## 4. A/C — Temporada baja

| Acomodación | Normal | A | B | C |
|---:|---:|---:|---:|---:|
| 1 persona | 90.000 | 75.000 | 75.000 | 80.000 |
| 2 personas | 130.000 | 110.000 | 110.000 | 115.000 |
| 3 personas | 170.000 | 145.000 | 145.000 | 155.000 |
| 4 personas | 210.000 | 180.000 | 180.000 | 190.000 |
| 5 personas | 250.000 | 210.000 | 210.000 | 225.000 |

**Nota:** el SIMP tiene 2 personas en 125.000, no 130.000. `[C]` cuál rige.

## 5. A/C — Temporada alta

| Acomodación | Normal | A | B | C |
|---:|---:|---:|---:|---:|
| 1 persona | 130.000 | 110.000 | 110.000 | 115.000 |
| 2 personas | 180.000 | 155.000 | 155.000 | 160.000 |
| 3 personas | 240.000 | 205.000 | 205.000 | 215.000 |
| 4 personas | 300.000 | 255.000 | 255.000 | 270.000 |
| 5 personas | 360.000 | 305.000 | 305.000 | 325.000 |

## 6. Habitaciones con ventilador

| Acomodación | Tarifa única | Descuentos |
|---:|---:|---|
| 1 persona | 50.000 | No aplica ninguno |
| 2 personas | 80.000 | No aplica ninguno |

- `[C]` capacidad máxima de las 7 y si existe tarifa para 3 o más.

## 7. Tarifas corporativas y convenios

El SIMP ya maneja **tarifas por empresa**, distintas de la matriz pública:

- Por empresa: Chemicals 80.000, Eiatec 80.000, BDB 60.000, Novomet 148.000, Rosen 120.000, OMIA 147.500, Borets 75.000, Aviatur 170.000, Smartstar 90.000.
- Genéricas: ventilador sin parqueadero 55.000, ventilador con parqueadero 60.000, A/C sin parqueadero 75.000, A/C con parqueadero 80.000 (1 persona); 85.000 / 90.000 / 105.000 / 110.000 para 2 personas.
- **El parqueadero cambia el precio.**
- El convenio incluye tarifa y **plazo de pago** (8, 15 o 30 días) y **cupo configurable** por empresa.

**Conclusión:** el modelo necesita `convenio_tarifa` por cliente/empresa, no solo la matriz pública.

## 8. Impuestos y documentos

- A las empresas o a quien pida **factura electrónica** se le suma **19 %**.
- `[C]` Si la lista es con IVA incluido o sin IVA.
- `[C]` **Bar:** en Colombia normalmente maneja impoconsumo del 8 %, no IVA del 19 %. Confirmar con el contador.
- `[C]` El hotel ya emite factura electrónica. Falta NIT, régimen, resolución y proveedor.
- **Impresoras:** por ahora solo **Kyocera láser en hoja grande (carta u oficio)**. La térmica para tirilla queda para después.

## 9. Reglas de estadía

- **Check-in 3 pm, check-out 1 pm.**
- Entrada desde las **12 pm sin cobro**; antes de las 12 se cobra por horas.
- Salida con tolerancia de **1 o 2 horas**; después se cobra adicional.
- **Empresas** pueden entrar temprano `[C]`.
- **Huésped adicional:** se pasa a la tarifa de la nueva acomodación `[C]` si se cobra completa o solo la diferencia.
- **Extensión:** una noche más, con saldo pendiente. `[C]` si la 4ta noche vuelve a normal.
- **Cambio de misma categoría:** sin recargo.
- **Mensualidad:** prepagada, con contrato impreso distinto al registro de hospedaje.
- **Reservas:** abono 50 %, sin devolución, reprogramable `[C]` condiciones.

## 10. Modelo de datos propuesto

```sql
temporada(id, codigo, nombre)                  -- BAJA, ALTA
temporada_fecha(id, temporada_id, desde, hasta)
tarifa(id, tipo_habitacion_id, temporada_id, acomodacion, escenario, valor)
convenio_tarifa(id, cliente_id, tipo_habitacion_id, acomodacion, valor, dias_credito, cupo)
```

- `acomodacion`: 1 a 5.
- `escenario`: `NORMAL`, `A`, `B`, `C`.
- El cargo guarda `tarifa_id`, `precio_lista` y `precio_cobrado`.
- El convenio guarda tarifa, plazo y cupo por empresa.

## 11. Pendientes

1. Confirmar la **206** y el total de 33 espacios (31 rentables + 103 bodega + Admin).
2. Confirmar cuáles son las **7 de ventilador** (la lista da 8: 108, 205, 207, 209, 301, 303, 305, 405).
3. Precio de **sextuple** y de **suite** en la 105.
4. Confirmar **130.000 vs 125.000** en 2 personas temporada baja.
5. IVA incluido o adicional; bar impoconsumo; datos de facturación.
6. Modelo de la **Kyocera** y tamaño de hoja; la térmica queda para después.
7. Confirmar el umbral de **15 habitaciones** para temporada alta y descuentos.
