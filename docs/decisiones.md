# Decisiones de arquitectura y alcance (ADR)

**Estado:** registro vivo. Cada decisión tiene estado `aceptada`, `propuesta` o `descartada`.
**Regla:** ninguna tarea puede contradecir una decisión `aceptada` sin actualizar este documento primero.

---

## ADR-001 — Alcance de la primera versión

**Estado:** aceptada (dueño, 18-nov-2026)

**Decisión:** la v1 es **recepción 24 horas**: alojamiento walk-in, reservas simples, folios, cobros, caja con turnos y traslados, bar recepción como venta rápida, roles y reportes básicos.

**Fuera de la v1:** restaurante (mesas y comandas), bar terraza como POS, inventario de bares, eventos, tours, nómina formal, propinas y facturación electrónica DIAN.

**Consecuencia:** las tablas de esas fases quedan escritas pero no se usan; no se construyen pantallas para ellas.

---

## ADR-002 — Los precios son una matriz, no un porcentaje

**Estado:** aceptada

**Contexto:** los descuentos nominales del 15 % y 10 % no coinciden con los precios redondeados de la lista (90 → 75 es 16,7 %; 170 → 155 es 8,8 %).

**Decisión:** almacenar el **precio final** por tipo × temporada × acomodación × escenario; el sistema no calcula porcentajes.

**Consecuencia:** la lista se administra como tabla de precios; el cargo guarda el precio de lista y el cobrado para medir el descuento real.

---

## ADR-003 — Local primero, nube después

**Estado:** propuesta (pendiente definir hardware)

**Contexto:** hay internet pero en el pueblo se cae con frecuencia, y la recepción opera 24 horas.

**Decisión:** en producción, un servidor local en recepción con PostgreSQL; respaldo diario a la nube; acceso remoto opcional para el dueño. El mismo código debe poder correr en la nube si más adelante se decide.

**Consecuencia:** se necesita un PC o mini PC encendido 24 h y una UPS. Se elimina la dependencia de Supabase en producción y se simplifica la impresión local.

---

## ADR-004 — El IVA es una línea de impuesto

**Estado:** propuesta (pendiente contador)

**Contexto:** a las empresas o a quien pide factura electrónica se le suma 19 %.

**Decisión:** modelar el impuesto separado del precio base; cada cargo guarda base, impuesto y total. El cobro y el reporte distinguen ingreso de impuesto.

**Consecuencia:** no se mezcla el impuesto con el ingreso del centro. Pendiente validar si el precio de lista incluye o no el IVA.

---

## ADR-005 — Un solo backend y JWT propio

**Estado:** aceptada

**Decisión:** el frontend no habla directamente con la base de datos; solo el backend con sus credenciales. Autenticación con usuario y contraseña, contraseña con bcrypt y JWT firmado por el backend. Se descarta Supabase Auth.

**Consecuencia:** la autorización vive en el backend; no se usan políticas RLS para el negocio.

---

## ADR-006 — Temporadas por calendario editable

**Estado:** propuesta

**Decisión:** los días de temporada alta se guardan en una tabla de fechas que el administrador puede editar.

**Consecuencia:** no se codifican los puentes en el código; el precio se resuelve por fecha.

---

## ADR-007 — Migrar el SIMP, no reconstruirlo

**Estado:** aceptada

**Contexto:** el SIMP tiene 523 reservas, 609 pagos, 392 clientes, 51 empresas, 32 habitaciones, 291 productos y 31 servicios. Es un volumen pequeño y contiene el histórico real.

**Decisión:** migrar maestros e histórico completo con un `legacy_id`; no migrar las 943 tarifas "Personalizada", ni la caja acumulada, ni los anexos BLOB.

**Consecuencia:** el SIMP queda en solo lectura; el nuevo sistema es la fuente de verdad desde el corte.

---

## ADR-008 — Los descuentos se seleccionan, no se calculan solos

**Estado:** aceptada

**Contexto:** A y B valen lo mismo (15 %), C es 10 %, y el SOP prohíbe ofrecer descuento de entrada y exige ocupación de 15 habitaciones o menos.

**Decisión:** el recepcionista selecciona el escenario; el sistema valida elegibilidad (hora, noches, ocupación, tipo de habitación) y registra precio de lista, precio cobrado, motivo y autorización. No se aplica automáticamente.

**Consecuencia:** todos hablan el mismo idioma y se puede medir cuánto se descuenta por escenario.

---

## ADR-009 — Temporada alta administrable con umbral

**Estado:** propuesta (pendiente confirmar el umbral)

**Decisión:** calendario editable por el administrador, con festivos y 15-dic a 15-ene por defecto. Más de 15 habitaciones ocupadas pasa a alta; 15 o menos permite descuentos.

**Consecuencia:** el precio se resuelve por fecha y ocupación; no hay puentes codificados.

---

## ADR-010 — Bar recepción dentro de la v1

**Estado:** propuesta

**Contexto:** el bar está completamente fuera del SIMP: 1.138 salidas y créditos en Excel.

**Decisión:** la v1 incluye catálogo de productos, venta, forma de pago, cargo a habitación y créditos de empleados. `[C]` el inventario (entradas, salidas, stock) entra en la v1 o en la siguiente franja.

**Consecuencia:** no se mantienen dos sistemas para el mismo dinero.

---

## ADR-011 — Dos impresoras

**Estado:** aceptada

**Decisión:** láser para factura en carta u oficio y térmica para tirilla de recibo.

**Consecuencia:** el backend genera PDF para la láser y comando ESC/POS para la térmica.

---

## ADR-012 — IVA solo con factura electrónica

**Estado:** propuesta (pendiente contador)

**Decisión:** el 19 % se suma solo cuando el cliente pide factura electrónica. Se registra como línea de impuesto separada del ingreso. El bar queda pendiente de confirmar si maneja impoconsumo.

**Consecuencia:** los reportes separan ingreso e impuesto; la práctica debe validarla el contador.

---

## ADR-013 — La caja arranca con corte de la planilla, no del SIMP

**Estado:** aceptada

**Decisión:** el saldo inicial del nuevo sistema es el último cierre de la planilla de caja acordado con el dueño. La caja del SIMP no se migra porque es un acumulado, no un saldo.

**Consecuencia:** se hace un acta de corte con efectivo contado, fecha y responsable.

---

## ADR-014 — La habitación tiene atributos dinámicos

**Estado:** aceptada

**Contexto:** las habitaciones con ventilador lo están porque el A/C no funciona; si se repara, se venden como A/C. Si no hay ventilador disponible, se pone uno en una habitación de A/C y se baja el taco. Además, 109, 208 y 403 a veces se configuran como quintuples y la 105 puede ser sextuple o suite.

**Decisión:** la climatización y la capacidad son atributos **de la estadía**, no solo de la habitación. Se guarda la configuración actual, el historial de cambios y la climatización vendida en cada reserva. La tarifa se selecciona por climatización vendida + acomodación + temporada + escenario.

**Consecuencia:** el recepcionista puede cambiar clima o capacidad con autorización y queda registro; la disponibilidad usa la capacidad máxima.

---

## ADR-015 — Temporada por demanda, no solo por calendario

**Estado:** propuesta (pendiente confirmar umbral)

**Contexto:** hay festivos buenos y festivos malos; si se marca alta por calendario y no llega gente, se pierden ventas.

**Decisión:** calendario base (festivos y 15-dic a 15-ene) más una **decisión diaria a las 3 pm**. Si hay reservas y la ocupación llega a **15 habitaciones**, se activa la **alta para las siguientes** y se cierran los descuentos; si no se llega a 15, el día va en **baja** y se habilitan A/B/C. El sistema sugiere y el admin confirma. La regla queda como **ejemplo configurable** para ir probando.

**Consecuencia:** el precio de la noche se cierra a las 3 pm; después de esa hora solo se aplica A si hay cupo y autorización.

---

## ADR-018 — Grupo: primero C, luego B

**Estado:** aceptada

**Contexto:** el grupo tiene 10 % (C), pero a veces no acepta y se va.

**Decisión:** a un grupo o varias habitaciones se le ofrece **C (10 %)**; si no acepta, se le ofrece **B (15 %)** para cerrar. B nunca se ofrece de entrada a un grupo.

**Consecuencia:** se protege el margen y se deja una carta de cierre; queda registrado qué escenario se usó.

---

## ADR-019 — Tarifa por pax y suite 105

**Estado:** aceptada

**Contexto:** la tarifa se cobra por persona: una triple vendida para 1 se cobra como sencilla, para 2 como doble y para 3 como triple. La 105 es la suite y se cobra como sextuple aunque vaya para 2 personas; la 106 es quintuple.

**Decisión:** el precio se selecciona por **número de pax** (1 a 6) + clima + temporada + escenario. La suite 105 usa la tarifa de 6 pax sin importar cuántos vayan. Las acomodaciones permitidas por habitación limitan los pax vendibles.

**Consecuencia:** no se cobra por la capacidad de la habitación sino por los pax; la suite es un producto de precio fijo.

---

## ADR-020 — Desayuno como dato y como cargo

**Estado:** aceptada

**Contexto:** el restaurante deja el desayuno en 12.000; algunas tarifas de empresa lo incluyen y otras no; la cocina necesita saber cuántos desayunos hay y en qué habitaciones.

**Decisión:** el desayuno se vende a **15.000 por persona** y se suma al valor de la noche según los pax. Si la tarifa de empresa ya lo incluye, no se suma. El IVA o impoconsumo queda pendiente por confirmar con el contador. La reserva guarda si va **incluido, pagado o no**, los pax con desayuno y el total; la cantidad es **pax × noches**. Si va incluido y no se consume, no se devuelve; si es pagado, no se devuelve automáticamente, pero el admin puede anular con motivo. Se genera un reporte diario para cocina.

**Consecuencia:** no se construye el módulo de restaurante en la v1, pero el dato queda desde el check-in y la cocina puede planear.

---

## ADR-016 — Solo impresora láser en la v1

**Estado:** aceptada

**Contexto:** hoy solo está operativa la Kyocera láser en hoja grande; la térmica no se usa.

**Decisión:** la v1 genera **PDF** para la Kyocera. La impresión térmica ESC/POS queda para una franja posterior.

**Consecuencia:** se elimina la dependencia de `node-escpos` y de la impresora térmica en la primera versión.

---

## ADR-017 — El corte de caja es el efectivo contado

**Estado:** aceptada

**Decisión:** el saldo inicial del sistema es el **efectivo contado en caja** al momento del corte. Se registra fecha, monto y responsable; no se arrastra la caja acumulada del SIMP.

**Consecuencia:** el arqueo del primer turno parte de una cifra real y verificable.
