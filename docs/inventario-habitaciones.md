# Inventario de habitaciones

**Estado:** borrador del 18-nov-2026, según lista del dueño. Pendiente confirmar 206, tarifa de sextuple/suite y el conteo de ventilador.
**Archivo de datos:** `seeds/habitaciones.csv`.

---

## 1. Composición

- **33 espacios** si se confirma la 206: **31 habitaciones rentables + 103 bodega + Admin oficina**.
- La lista del dueño tiene **30 habitaciones** (no incluye 206) y omite 103 y Admin.
- **22 con A/C** y **8 con ventilador** según la lista. El dueño había dicho 7; hay que definir cuál de las 8 no cuenta o si una ya tiene A/C.

| Piso | Habitaciones |
|---|---|
| 1 | 104, 105, 106, 107, 108, 109, 110, 111 |
| 2 | 201, 202, 203, 204, 205, 206, 207, 208, 209, 210 |
| 3 | 301, 302, 303, 304, 305, 306, 307, 308 |
| 4 | 401, 402, 403, 404, 405 |
| Otros | 103 (bodega), Admin (oficina) |

## 2. Capacidades

- **1 o 2 personas:** 104, 108, 110, 111, 204, 207, 209, 210, 301, 304, 305, 306, 307, 308, 401, 402, 405.
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
- `[C]` ¿La suite tiene tarifa propia o se cobra como sextuple? Falta el precio de 6 personas y de suite.

## 5. Reglas operativas

- La 103 es bodega y no se renta.
- Admin es oficina y no se renta.
- Una habitación puede cambiar de capacidad y de clima; el recepcionista debe poder hacerlo con autorización y dejar registro.
- La disponibilidad se calcula por fechas y por capacidad máxima, no por tipo fijo.

## 6. Pendientes

1. Confirmar si existe la **206** y en qué estado está.
2. Confirmar cuáles son las **7 de ventilador** (la lista da 8).
3. Precio de **sextuple** y de **suite**.
4. Si la suite incluye algo especial (sala, jacuzzi, etc.).
5. Confirmar el total: ¿33 incluye 103 y Admin?
