# IVA e impoconsumo — explicación simple

**Estado:** borrador para revisar con el contador. No es asesoría tributaria.
**Para qué sirve:** entender por qué el mismo desayuno puede costar distinto según cómo se facture.

---

## 1. Son dos impuestos distintos

| | **IVA** | **Impoconsumo** |
|---|---|---|
| Tarifa | 19 % general | 8 % en restaurantes y bares |
| Aplica a | Alojamiento y muchos servicios | Comida y bebida preparada, restaurante, bar |
| Cómo se cobra | Se discrimina: precio + IVA | Normalmente va **incluido** en el precio del menú |
| Quién lo paga | El huésped | El cliente final, dentro del precio |
| Quién lo declara | El hotel | El restaurante/bar |

En palabras simples:

- **IVA:** es un impuesto que se suma al precio. Si la habitación vale 130.000 + IVA, el huésped paga 154.700; el hotel se queda con 130.000 y le pasa 24.700 a la DIAN.
- **Impoconsumo:** es un impuesto que ya viene dentro del precio del restaurante o bar. Si el desayuno vale 15.000 con impoconsumo incluido, el negocio se queda con 13.889 y le pasa 1.111.

## 2. El desayuno de 15.000

| Cómo se maneje | Paga el huésped | Le queda al hotel | Margen sobre 12.000 |
|---|---:|---:|---:|
| 15.000 + IVA 19 % | 17.850 | 15.000 | 3.000 |
| 15.000 con IVA incluido | 15.000 | 12.605 | 605 |
| 15.000 con impoconsumo 8 % incluido | 15.000 | 13.889 | 1.889 |

**Recomendación:** no venderlo a 15.000 con IVA incluido: el margen queda casi en cero. Si es restaurante, 15.000 con impoconsumo incluido es aceptable. Si es alojamiento, 15.000 + IVA.

## 3. Alojamiento vs. restaurante

- **Alojamiento:** IVA del 19 %. El precio puede ser “más IVA” o “IVA incluido”; hay que definirlo.
- **Restaurante y bar:** impoconsumo del 8 %, normalmente incluido en la carta.
- **Desayuno:** depende de cómo se facture. Si va en la factura del alojamiento, podría llevar IVA; si se vende como consumo del restaurante, impoconsumo. **Eso lo define el contador.**

## 4. Lo que el sistema necesita saber

- `tipo_impuesto`: `IVA`, `IMPOCONSUMO` o `NINGUNO`.
- `tarifa_impuesto`: 19 u 8.
- `precio_incluye_impuesto`: verdadero o falso.
- `impuesto_monto`: el valor del impuesto, separado del ingreso.

El sistema no debe tener el impuesto quemado en el código: se configura por concepto.

## 5. Lo que debe confirmar el contador

1. ¿Los precios de alojamiento son **con IVA incluido** o **más IVA**?
2. ¿El desayuno se factura como **alojamiento** (IVA) o como **restaurante** (impoconsumo)?
3. ¿El bar y el restaurante tienen el impoconsumo **incluido** en la carta o se discrimina?
4. ¿Hay servicios excluidos o exentos?
5. ¿La factura electrónica discrimina los impuestos? ¿Con qué proveedor y resolución?

## 6. Advertencia

Cobrar el IVA solo a quien pide factura es una práctica riesgosa: el precio al público normalmente debe incluir los impuestos. El sistema puede manejar las dos formas, pero la decisión es del contador y del dueño. No la tomemos desde el código.
