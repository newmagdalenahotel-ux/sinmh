# Procesos operativos — Hotel New Magdalena

**Estado:** borrador de descubrimiento, no normativo
**Fuente:** entrevista con el dueño, 18-nov-2026
**Para qué sirve:** insumo para reescribir el alcance de la Fase 1A. No reemplaza `SPEC.md` hasta que el dueño lo valide.

**Convenciones:**
- `[C]` por confirmar con el dueño.
- `[N]` proceso o regla que no está en `SPEC.md` / `design.md`.
- `[D]` decisión pendiente.

---

## 0. El negocio en una página

El complejo opera hoy siete unidades: **alojamiento, bar recepción, bar terraza, restaurante, eventos, piscina/pasadías y tour Represa de Prado**. La lavandería existe como coste interno (la camarera lava).

- **Caja:** una sola caja central que maneja alojamiento y bar recepción. Bar terraza y restaurante entregan su efectivo a la caja central al final del turno.
- **Horario:** 24 horas, 2 o 3 turnos. El responsable del efectivo es **quien recibe en recepción**.
- **Quién decide:** el dueño autoriza gastos y cortesías; el administrador debería encargarse de las compras y valida en recepción; recepción vende y cobra; la camarera limpia y reporta; cocina, mesero y bar atienden.
- **Perfil de demanda:** el flujo principal es **walk-in** (llega sin reserva); las reservas son minoría; las empresas y grupos de trabajo compran a crédito con plazos; los tours casi no se venden.
- **Escala:** 33 habitaciones (capacidad de 1 a 5 personas) y la suite `[C]`; 7 habitaciones con ventilador. Personal: 1 administrador, 3 recepcionistas, 1 camarera, 1 mesero de bar terraza; restaurante con 2 meseros, 2 chefs y 1 auxiliar; el dueño.
- **Internet:** hay, pero en el pueblo se cae con frecuencia.

---

## 1. Alojamiento

### 1.1 Llegada sin reserva (walk-in) — flujo principal

1. Se le ofrece la tarifa. Puede haber descuento condicionado (§1.2).
2. El cliente acepta y se le piden los datos y el documento.
3. Se le asigna habitación.
4. Se recibe el pago. **El pago al inicio es la regla**; excepcionalmente se permite pagar después `[C]` quién autoriza.
5. Se abre el folio.

### 1.2 Descuentos condicionados `[N]`

- El precio **no se calcula con un porcentaje**: se cobra una **lista de precios por escenario** (ver `tarifas.md`).
- **Escenario A:** llegada después de las **7:30 pm** → 15 % nominal `[C]` ¿solo la primera noche?
- **Escenario B:** **2da y 3ra noche** → 15 % nominal `[C]` ¿4ta noche en adelante?
- **Escenario C:** grupos o regateo de última hora → 10 % nominal `[C]` ¿quién autoriza?
- Las habitaciones con ventilador no tienen ningún descuento.
- Además existe el **descuento manual** negociado en el mostrador, con motivo y autorización.
- Sin definir: si los escenarios se acumulan y sobre qué tarifa se calculan.

### 1.3 Patrones de pago y responsable `[N]`

Se identificaron cuatro casos distintos, y el sistema tiene que soportarlos por separado:

1. Una persona paga su propia habitación.
2. Una persona llega con varias habitaciones, dice "anóteme mis datos en todas" y **paga todo**.
3. Una **empresa** reserva para varios trabajadores y **paga la empresa**.
4. Un **grupo** donde **cada uno paga lo suyo**.

Los casos 2 y 3 exigen folio maestro con hijos y un **pagador designado**; el caso 4 exige folios separados.

### 1.4 Cortesías `[N]`

El dueño regala habitaciones a personas. También hay cortesías a la policía en los bares. Deben quedar registradas con autorización y motivo, y reportarse mensualmente.

### 1.5 Mensualidad `[N]`

- Es **pago anticipado**.
- Hoy no se firma contrato, pero **debería firmarse un documento**; es distinto del registro de hospedaje por noches.
- Falta definir: precio, día de corte, prorrateo por entrada a mitad de mes, depósito, mora y terminación.

### 1.6 Por horas / "ratos" `[N]`

- Se manejan habitaciones por horas y también paquetes de habitación por horas + piscina.
- Falta definir: mínimo de horas, tarifa por hora y hora de salida.

### 1.7 Reservas `[C]`

- Abono del **50%** en la mayoría de los casos.
- **No hay devolución**; se puede **reprogramar** la fecha.
- Hay clientes que llaman y dicen "voy para allá" y usan la habitación en el día: reserva telefónica **sin abono**.
- Falta definir: cuántas reprogramaciones se permiten, hasta cuándo, y qué pasa con el no-show.

### 1.8 Extensiones y cambios de habitación `[N]`

- Extender la estadía = **una noche más**, y el saldo queda pendiente.
- Cambio dentro de la **misma categoría**: sin recargo.
- Cambio de una habitación de 2 a una de 3 personas: **se recalcula la tarifa**.
- A veces se da descuento en la noche adicional `[C]` quién autoriza.

### 1.9 Horarios y cargos por tiempo `[N]`

- **Check-in: 3 pm. Check-out: 1 pm.**
- Se permite entrar desde las **12 pm sin cobro** (para no perder turistas). Antes de las 12 se cobra por horas.
- Salida: se toleran **1 o 2 horas**; después se cobra el adicional.
- **Empresas:** se les permite entrar temprano porque solo dejan las cosas y salen a trabajar `[C]` si es excepción permanente.

### 1.10 Huésped adicional `[N]`

Si la habitación es para una persona y entra otra, se pasa a la tarifa de la nueva acomodación `[C]` si se cobra completa o solo la diferencia.

### 1.11 Documentos

Dos documentos distintos: **registro de hospedaje por noches** y **contrato de mensualidad**. Ninguno requiere firma electrónica en esta fase; ambos deben poder imprimirse.

---

## 2. Caja

### 2.1 Estructura

- **Una caja central:** alojamiento + bar recepción.
- **Bar terraza** y **restaurante**: su efectivo debe estar en la caja central al final del turno.
- El resto de cobros (tarjeta, transferencia) no entra a la caja física.
- Hoy la operación se lleva en **dos Excel**: uno de caja y otro de bar recepción (ventas, ingresos, salidas, créditos, pagos).

### 2.2 Turnos y responsabilidad `[N]`

- Operación 24 horas con **2 o 3 turnos**. Cuando alguien descansa quedan 2.
- **El que cuenta es la persona que recibe en recepción**: el conteo lo hace el entrante y el saliente responde.
- Cada turno debe quedar identificado con su responsable.

### 2.3 Faltantes y sobrantes

- En cada turno se investiga el faltante o sobrante.
- Si no se explica, **se le cobra al de turno** `[C]` cómo se documenta y si hay autorización firmada del empleado (tema laboral).
- Si es sobrante, se registra para ajuste.

### 2.4 Gastos

- Los autoriza el dueño `[C]` si autoriza todo o hay un umbral por monto.
- Se realiza la compra y se registra con empresa/proveedor y descripción detallada.
- **Se pide factura siempre.** Si el local no la da, se registra igual con descripción y soporte.
- Pagos a técnicos o trabajadores: **recibo con datos y firma** de quien recibe.
- **La nómina sale de la caja.**

### 2.5 Soportes digitales `[N]`

Para no guardar papel: **fotografiar o escanear el recibo** y adjuntarlo al registro. Hay recibos manuscritos sin datos del proveedor: se registra monto, descripción y foto.

### 2.6 Dinero del dueño `[N]`

- **Efectivo:** entra a la caja.
- **Tarjeta y transferencia:** llegan a cuentas del dueño. Se verifica que entraron, pero él maneja esas cuentas directamente: lo que entra allí ya no vuelve y **a veces no registra en qué lo gastó**.
- El dueño **pide dinero o pide que se lo envíen**; también **mete efectivo** para pagar algo. Ejemplo: hay que pagar 100.000 de un recibo, él ingresa el efectivo y se hace la salida; o paga el recibo de la luz con dinero propio.
- Implicación: todo cobro con tarjeta/transferencia debe registrarse con **destino dueño** y generar **cuenta por cobrar al socio**, aunque él no registre el gasto. Es la única forma de que la deuda quede visible.

### 2.7 Cierre

- Cierre por turno: efectivo esperado vs. contado, con diferencia firmada.
- `[C]` La fórmula debe incluir traslados, retiros del dueño y aportes de efectivo, no solo ventas y gastos.

---

## 3. Folios y cobros

### 3.1 Consumo

- Si el huésped consume, **se le cobra en el momento** o **se le anota al folio** y paga a la salida.
- En el check-out se paga todo de una vez.

### 3.2 Empresas

- Se pasa la factura/cuenta de cobro a la empresa y se espera el pago.
- Se necesita un **consolidado por empresa** (lo que consumieron sus trabajadores) y el **detalle por trabajador**, pero se envía el **valor total**.
- Plazos de pago: **8, 15 o 30 días** según el acuerdo con cada empresa.
- `[C]` Para empresas no hay tope de crédito; el tope mencionado antes aplica a empleados o grupos de trabajo.

### 3.3 Grupo de trabajo / empleados

- Se deja como **crédito con tope**; pagan cuando puedan o hacen abonos; al llegar al tope no se puede cargar más.

### 3.4 Particulares y turistas

- Pagan todo de una vez (al inicio o al check-out).

### 3.5 Consumo de restaurante y bar

- Se puede **anotar a la habitación**.

### 3.6 Factura electrónica e IVA `[N]`

- A las empresas o a quien pida **factura electrónica** se le suma **19 %**.
- `[C]` Si los precios de la lista son con IVA incluido o sin IVA, y si el hotel ya emite factura electrónica (proveedor, NIT, régimen y resolución DIAN).
- Riesgo que debe revisar el contador: cobrar el IVA solo a quien pide factura no es lo que permite la ley; el precio al público normalmente debe incluir impuestos.

---

## 4. Restaurante

- Mesas y para llevar.
- **Comanda a la cocina en papel** (hoy no hay sistema).
- Se puede pagar entre uno, dos o varios; o cargar a la habitación.
- **No se maneja propina** en el sistema.
- Atiende externos y huéspedes en las mismas mesas; hay menú, carta y bebidas.
- Fase posterior: mesas, comandas y pago dividido.

---

## 5. Bares

- Se compra cuando el inventario baja a 2 o 3 unidades `[C]`.
- Se hacen pedidos como en la terraza `[C]` periodicidad.
- Producto dañado o vencido: **se registra como pérdida**.
- Los empleados consumen, pero **se les hace crédito con tope** y pagan o hacen abonos.
- Hay cortesías autorizadas por el dueño o el administrador.
- A varios proveedores se les paga de una vez.
- Fase posterior: inventario, pérdidas y POS de bar.

---

## 6. Eventos

- Se cobra un **porcentaje por el uso del espacio: 10% o 50%** `[C]` base de cálculo.
- **Se devuelve** si se cancela con **24 horas de anticipación**.
- Incluye mobiliario, mesas, sillas, un bafle y acceso a la piscina.
- **No hay consumo de bar:** la persona trae su comida y su trago.
- `[D]` ¿Entra en la primera versión? Recomendación: no; registrar el anticipo como venta de servicio.

---

## 7. Piscina y pasadías

- Se vende la entrada; se paga en efectivo, transferencia o tarjeta.
- Horario: **9 am a 6 pm** (día) o **6 pm a 10 pm** (noche).
- Valores: **15 día / 10 noche** `[C]` unidad, probablemente miles de pesos.
- Hay descuentos si vienen grupos ("el del pueblo, déjelo en tanto").
- `[D]` Recomendación: sí entra en la primera versión, como venta rápida de recepción.

---

## 8. Paquetes y tour

- Paquetes: habitación por horas + piscina; habitación + almuerzo + piscina.
- Tour Represa de Prado: pequeño, mediano y completo; con alojamiento y comidas 2 días / 1 noche; versión para parejas.
- **Solo se ha vendido uno.** `[D]` Recomendación: posponer.

---

## 9. Personal y turnos

- **Administrador (1):** dirección, compras y validación en recepción.
- **Recepcionistas (3):** alojamiento, bar recepción, eventos, piscina/pasadías y paquetes de Prado. El bar recepción lo atiende el recepcionista de turno.
- **Camarera (1):** lava y reporta qué habitaciones ya están limpias.
- **Bar terraza (1 mesero).**
- **Restaurante:** 2 meseros, 2 chefs y 1 auxiliar.
- **Dueño:** autoriza gastos, cortesías y retiros.
- **Averías:** daños en habitaciones que hay que arreglar; se necesita seguimiento por habitación.
- **Propinas:** no se manejan; si le dan, se la queda quien la recibe.

---

## 10. Compras y proveedores

- A veces compra el **dueño con su propio dinero** (inventario de bar); a veces el **administrador con dinero de caja**; a veces el recepcionista; a veces se le da dinero a piscina para comprar producto y trae el recibo.
- Debería encargarse **el administrador**.
- **No hay proveedores fijos**; se paga de contado.
- Los recibos son **del complejo completo, no divididos por servicio** `[C]` y al parecer algunos servicios están incluidos en el arriendo.
- Hay reparaciones (nevera, silla, pintura) y cortesías (policía en bares).
- `[C]` Sin regla de asignación por centro, el "resultado por centro" no es confiable.

---

## 11. Habitaciones: limpieza y averías

- La camarera reporta cuando la habitación está limpia.
- Las averías se reportan y se reparan.
- `[N]` Estados necesarios: **OCUPADA → LIMPIEZA → (reporte de camarera) → DISPONIBLE**, y **avería bloquea** la habitación.

---

## 12. Reglas de negocio detectadas

1. **RN-01** — Toda persona sin reserva puede hospedarse si hay habitación: tarifa → datos → habitación → cobro → folio.
2. **RN-02** — El cobro al inicio es la regla; el pago posterior requiere autorización `[C]`.
3. **RN-03** — El precio se cobra con la **matriz** temporada × acomodación × escenario: A llegada ≥ 7:30 pm, B 2da y 3ra noche, C grupos/regateo. No se calcula porcentaje.
4. **RN-04** — Ventilador: tarifa fija sin descuento. El descuento manual solo con motivo y autorización.
5. **RN-05** — Un pagador puede cubrir varias habitaciones: folio maestro con hijos y pagador designado.
6. **RN-06** — Grupo donde cada uno paga: un folio por persona/habitación.
7. **RN-07** — Empresa: cuenta por cobrar, consolidado por empresa y detalle por trabajador.
8. **RN-08** — Empleado o grupo de trabajo: crédito con tope y abonos; bloqueo al llegar al tope.
9. **RN-09** — Cortesía: cargo a monto 0 con autorización del dueño y reporte mensual.
10. **RN-10** — Mensualidad prepagada, con contrato impreso distinto al registro de hospedaje.
11. **RN-11** — Habitación por horas: tarifa por hora con mínimo `[C]`.
12. **RN-12** — Reserva: abono 50% por defecto; sin devolución; reprogramable `[C]` condiciones.
13. **RN-13** — Check-in 3 pm, check-out 1 pm; entrada desde 12 pm sin cobro; antes de 12 se cobra por horas.
14. **RN-14** — Tolerancia de salida de 1 a 2 horas; después se cobra adicional.
15. **RN-15** — Empresas pueden entrar temprano `[C]` si es excepción permanente.
16. **RN-16** — Extensión: una noche más, con saldo pendiente.
17. **RN-17** — Cambio de misma categoría: sin recargo; cambio a más capacidad: recalcula tarifa.
18. **RN-18** — Huésped adicional en habitación sencilla: se cobra.
19. **RN-19** — Una sola caja central para alojamiento y bar recepción; terraza y restaurante entregan al cierre.
20. **RN-20** — Turnos de 24 horas: 2 o 3; el responsable es quien recibe y cuenta.
21. **RN-21** — Faltante no explicado: se cobra al responsable `[C]` con autorización; sobrante: ajuste.
22. **RN-22** — Gasto: autorización del dueño `[C]` umbral, factura o soporte, registro con proveedor y descripción.
23. **RN-23** — Soportes digitalizados adjuntos al gasto (foto o escaneo).
24. **RN-24** — Pagos a terceros y nómina desde caja, con recibo firmado.
25. **RN-25** — Tarjeta o transferencia a cuentas del dueño: cobro con destino dueño y cuenta por cobrar al socio.
26. **RN-26** — Retiro del dueño: cuenta socio. Aporte de efectivo del dueño: ingreso y salida.
27. **RN-27** — Efectivo esperado = apertura + ventas en efectivo + ingresos + traslados de entrada + aportes − gastos − retiros − traslados de salida − retiros del dueño ± ajustes `[C]`.
28. **RN-28** — Check-out cobra todo el saldo; se permite pago parcial `[C]`.
29. **RN-29** — Recibo de caja numerado y sin duplicados `[C]` numeración por sesión o global.
30. **RN-30** — Habitación: OCUPADA → LIMPIEZA → DISPONIBLE por reporte de camarera; avería bloquea.
31. **RN-31** — Propinas no se registran; se las queda quien las recibe `[C]` confirmar.
32. **RN-32** — Recibos del complejo no se dividen por servicio: asignar a un centro general o prorratear `[C]`.
33. **RN-33** — Eventos: anticipo 10% o 50%, devolución con 24 horas, sin consumo de bar `[D]` fase.
34. **RN-34** — Pasadías: entrada día/noche con precio y descuento por grupo `[D]` fase.
35. **RN-35** — Empresa o factura electrónica: se suma **19 %** de IVA `[C]` base y comprobante.
36. **RN-36** — La v1 es recepción, bar recepción, caja, movimientos y roles; lo demás es fase posterior.
37. **RN-37** — Producción local primero: la operación no puede depender del internet.
38. **RN-38** — Temporada alta por calendario editable, no codificada.

---

## 13. Qué implica para el plan actual

1. **El flujo principal es walk-in, no reservas.** La Franja 1 debe ser check-in directo; las reservas entran después.
2. **En recepción se vende más que alojamiento:** bar recepción, pasadías, anticipos de eventos. La primera versión necesita una **venta rápida** (concepto, monto, método, o cargo a folio), no solo folios de habitación.
3. **Los descuentos son una regla, no un campo libre.** Mínimo: descuento manual con motivo y autorización; y la matriz de precios por escenario.
4. **La caja tiene 2 o 3 turnos y un responsable identificable.** El cierre debe guardar quién recibe, quién entrega y cómo se resolvió la diferencia.
5. **El dinero del dueño es un agujero contable.** Tarjeta y transferencia a sus cuentas deben quedar como deuda del socio, aunque él no registre sus gastos.
6. **Sin regla de asignación por centro, el resultado por centro es ficción**, porque los recibos son del complejo completo.
7. **La mensualidad y el uso por horas son ingresos reales**, no casos raros.
8. **La habitación tiene un ciclo de limpieza y averías** que hoy no está en el plan.
9. **Los precios son una matriz, no un porcentaje:** los valores de la tabla están redondeados (90 → 75 es 16,7 %), así que se guardan como lista de precios.
10. **El internet del pueblo se cae:** la operación no puede depender de la nube. Propuesta: servidor local en recepción y respaldo a la nube.
11. **v1 confirmada por el dueño:** recepción, bar recepción, caja, movimientos y roles.
12. **El IVA del 19 % solo aparece cuando piden factura**, y eso hay que modelarlo como impuesto separado, no como aumento de precio.

---

## 14. Preguntas abiertas

### Resueltas el 18-nov-2026

- Inventario: 33 habitaciones de 1 a 5 personas, 7 con ventilador, más suite `[C]`.
- Tarifas: ver `tarifas.md` y `seeds/tarifas.csv`.
- Personal: 1 administrador, 3 recepcionistas, 1 camarera, 1 mesero de bar terraza, 2 meseros, 2 chefs y 1 auxiliar de restaurante, dueño.
- Crédito: 8, 15 o 30 días según acuerdo; sin tope para empresas `[C]` para empleados.
- Hoy usan Excel de caja y Excel de bar recepción.
- Internet: existe, pero se cae con frecuencia.
- Validación: el administrador valida en recepción.
- Despliegue: construir local y subir a medida que se avanza.

### Pendientes de datos

1. Desglose de las 33 habitaciones: número, tipo (A/C, ventilador, suite), capacidad máxima y piso. Plantilla: `seeds/habitaciones.csv`.
2. Suite: cuántas, capacidad y tarifa.
3. Temporada alta: calendario de puentes y quién lo marca.
4. IVA: ¿precios con IVA incluido o sin IVA? ¿Ya emiten factura electrónica? ¿Proveedor y resolución? ¿Qué es "la de láser"?
5. Impresora: térmica para recibos (marca y conexión) y láser para facturas.
6. Bar recepción: ¿catálogo de productos con precio o solo total de la venta? ¿Maneja IVA o impoconsumo?
7. Servidor local: ¿hay PC o mini PC que quede encendido 24 h en recepción? ¿Hay UPS? ¿Quién lo mantiene?
8. Los dos Excel actuales (caja y bar recepción) para replicar campos y reportes.
9. Mensualidad: precio, día de corte, prorrateo y contrato.
10. Reservas: reprogramaciones permitidas y no-show.
11. Faltantes de caja: forma de descuento y autorización escrita.
12. Compras: umbral de autorización y asignación de recibos por centro.
13. Propinas: confirmar que quedan fuera.
