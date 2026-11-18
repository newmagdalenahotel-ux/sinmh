# Inventario de habitaciones

**Estado:** borrador del 18-nov-2026, confirmado con el dueño.
**Archivo de datos:** `seeds/habitaciones.csv`.

---

## 1. Composición

- **33 espacios:** **31 habitaciones rentables + 103 bodega + Admin oficina**.
- **23 con A/C y 8 con ventilador.** Las 8 de ventilador son: 108, 205, 207, 209, 301, 303, 305 y 405.
- La 206 es sencilla o doble, A/C.

| Piso | Habitaciones |
|---|---|
| 1 | 104, 105, 106, 107, 108, 109, 110, 111 |
| 2 | 201, 202, 203, 204, 205, 206, 207, 208, 209, 210 |
| 3 | 301, 302, 303, 304, 305, 306, 307, 308 |
| 4 | 401, 402, 403, 404, 405 |
| Otros | 103 (bodega), Admin (oficina) |

## 2. La suite: 106

- La **106** es la suite: **dos espacios, dos baños, dos televisores y dos aires acondicionados**.
- Un espacio va con cama y el otro con sofá, comedor y nevera cuando se configura como suite.
- Se puede vender como **6 personas** o como **suite para 2**.
- **Se cobra como sextuple**, aunque vaya para 2 personas.
- La **105** se vende para 5 o 6; `[C]` confirmar si también se puede configurar como suite.

## 3. Capacidad y tarifa por pax

La tarifa es **por persona**, no por habitación. Una triple vendida para 1 se cobra como sencilla; para 2, como doble; para 3, como triple. Igual para 105, 109, 208 y 403.

| Habitación | Configuración | Se vende para | Tarifa |
|---|---|---|---|
| 105 | 5 o 6 | 5 o 6 | Según pax (quintuple o sextuple) |
| 106 | 6 o suite | 6, o suite para 2 | Sextuple en ambos casos |
| 106 | — | suite para 2 | Sextuple |
| 201 | 5 | 5 o 4 | Según pax |
| 109, 208, 403 | 4 o 5 | 4 o 3; 5 o 4 | Según pax |
| Triples | 3 | 3, 2 o 1 | Triple, doble o sencilla |
| Dobles | 2 | 2 o 1 | Doble o sencilla |
| 205 | 1 | 1 | Sencilla |

- La regla general es **vender para la capacidad configurada o una persona menos**.
- Las triples además pueden bajar hasta 1.
- Para subir de capacidad se pone otra cama y se cambia la configuración, con historial.
- La disponibilidad filtra por el **conjunto de acomodaciones permitidas**, no por “1 hasta el máximo”.

## 4. Climatización dinámica

- Las de ventilador están así porque el A/C no funciona. Si se repara, se venden como A/C.
- Si no hay habitación de ventilador disponible, se pone un ventilador en una de A/C y se baja o quita el taco; se cobra como ventilador.
- La climatización es un atributo **de la estadía**: se guarda la configuración actual, el historial y la climatización vendida.

## 5. Reglas operativas

- La 103 es bodega y no se renta.
- Admin es oficina y no se renta.
- Una habitación puede cambiar de capacidad y de clima; el recepcionista debe poder hacerlo con autorización y dejar registro.
- La disponibilidad se calcula por fechas y por acomodaciones permitidas.

## 6. Pendientes

1. Confirmar si la **105** también se puede configurar como suite.
2. Confirmar si la **106** se vende para 5 o solo 6 y suite.
3. Confirmar si la suite incluye algo especial además de los dos espacios.
