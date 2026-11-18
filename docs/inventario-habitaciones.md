# Inventario de habitaciones

**Estado:** borrador del 18-nov-2026, confirmado con el dueño. Pendiente el conteo exacto de ventilador.
**Archivo de datos:** `seeds/habitaciones.csv`.

---

## 1. Composición

- **33 espacios confirmados:** **31 habitaciones rentables + 103 bodega + Admin oficina**.
- **22 con A/C** y **8 con ventilador** según la lista. El dueño había dicho 7 y la tabla de tarifas también dice 7; hay que definir cuál de las 8 no cuenta o si una ya tiene A/C.
- La 206 quedó confirmada: sencilla o doble, A/C.

| Piso | Habitaciones |
|---|---|
| 1 | 104, 105, 106, 107, 108, 109, 110, 111 |
| 2 | 201, 202, 203, 204, 205, 206, 207, 208, 209, 210 |
| 3 | 301, 302, 303, 304, 305, 306, 307, 308 |
| 4 | 401, 402, 403, 404, 405 |
| Otros | 103 (bodega), Admin (oficina) |

## 2. Capacidades

- **1 o 2 personas:** 104, 108, 110, 111, 204, 206, 207, 209, 210, 301, 304, 305, 306, 307, 308, 401, 402, 405.
- **1 persona:** 205.
- **3 personas:** 107, 202, 203, 302, 303, 404.
- **4 o 5 personas:** 109, 208, 403.
- **5 personas:** 106, 201.
- **5, 6 o suite:** 105.

La capacidad **no es rígida**: 109, 208 y 403 a veces se ponen quintuples, y 105 puede ser sextuple o suite. Para el sistema, `capacidad_max` es el tope y la tarifa se resuelve por la acomodación vendida.

## 3. Climatización dinámica

- Las de ventilador están así **porque el A/C no funciona**. Si se repara, se venden como A/C.
- Si no hay habitación de ventilador disponible, se puede poner un ventilador en una de A/C y **bajar o quitar el taco del aire**; en ese caso se cobra como ventilador.
- Por eso la climatización no es un atributo fijo de la habitación: es un atributo **de la estadía**. El sistema debe guardar la climatización vendida y el cambio en la habitación, con historial.
- La tarifa se selecciona por **climatización vendida + acomodación + temporada + escenario**.

## 4. Suite

- La suite no es una habitación aparte: **105 se configura como suite** (también quintuple o sextuple).
- **La suite se cobra al mismo precio que la sextuple.**
- Ver la tabla de sextuple en `tarifas.md`.

## 5. Reglas operativas

- La 103 es bodega y no se renta.
- Admin es oficina y no se renta.
- Una habitación puede cambiar de capacidad y de clima; el recepcionista debe poder hacerlo con autorización y dejar registro.
- La disponibilidad se calcula por fechas y por capacidad máxima, no por tipo fijo.

## 6. Pendientes

1. Confirmar cuáles son las **7 de ventilador** (la lista da 8: 108, 205, 207, 209, 301, 303, 305, 405).
2. Confirmar si la suite incluye algo especial (sala, jacuzzi, etc.).
3. Confirmar si la 105 puede venderse para 1 a 4 personas o solo 5, 6 y suite.
