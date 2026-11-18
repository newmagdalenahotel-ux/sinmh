# Design System â€” Hotel New Magdalena

**VersiÃ³n:** 2.0
**Fecha:** 2026-11-13
**Estado:** Validado â€” basado en la identidad visual oficial del hotel

---

## 1. Paleta de colores (tokens)

### Navy â€” Fondos estructurales e identidad
| Token | HEX | Uso en el sistema |
|---|---|---|
| `navy-dark` | `#060f1e` | Sidebar, topbar, fondos de modales oscuros, headers de tabla |
| `navy` | `#0b1d3a` | Fondo de secciones alternas, cards de dashboard |
| `navy-light` | `#152d5a` | Hover de elementos navy, bordes de separaciÃ³n |

### Gold â€” Acentos y jerarquÃ­a
| Token | HEX | Uso en el sistema |
|---|---|---|
| `gold-light` | `#e0c99a` | Texto secundario sobre fondos navy, divisores |
| `gold` | `#c8a96e` | Botones primarios, links, badges de estado activo, iconos destacados |
| `gold-dark` | `#9e7d46` | Hover de botones primarios, sombras de elementos gold |

### Neutros y superficies
| Token | HEX | Uso en el sistema |
|---|---|---|
| `cream` | `#faf6f0` | Fondo de pÃ¡gina principal, fondo de formularios |
| `cream-dark` | `#f0e8d8` | Fondo de cards, filas alternas de tabla |
| `stone` | `#4a4a4a` | Texto principal sobre fondos claros |
| `stone-light` | `#7a7a7a` | Texto secundario, placeholders, labels |

### SemÃ¡nticos (para estados operativos)
| Token | HEX | Uso |
|---|---|---|
| `success` | `#10B981` | Check-in exitoso, pago registrado, folio cerrado correctamente |
| `warning` | `#F59E0B` | Saldo pendiente, habitaciÃ³n por limpiar, diferencia de caja |
| `error` | `#EF4444` | Error de validaciÃ³n, cuenta vencida, faltante de caja |
| `info` | `#3B82F6` | Mensajes informativos, tooltips |

---

## 2. TipografÃ­a

### Display (tÃ­tulos y acentos editoriales)
- **Fuente:** `Playfair Display` (serif)
- **Uso en el sistema:** Encabezados de pÃ¡gina (`h1`, `h2`), tÃ­tulos de modales, cifras destacadas del dashboard (KPIs).
- **Pesos:** 400 (regular), 600 (semibold), 700 (bold).
- **Escala:**
  - `display-xl`: `clamp(2.5rem, 6vw, 5rem)` â€” solo para el dashboard principal.
  - `display-md`: `clamp(2rem, 4vw, 3.5rem)` â€” tÃ­tulos de pÃ¡gina.
  - `section-title`: `clamp(1.75rem, 3vw, 2.75rem)` â€” tÃ­tulos de secciÃ³n.

### Body (lectura, interfaces y micro-copia)
- **Fuente:** `DM Sans` (sans-serif)
- **Uso en el sistema:** PÃ¡rrafos, botones, inputs, tablas, mensajes de error, tooltips.
- **Pesos:** 400 (regular), 500 (medium), 700 (bold).
- **Escala:**
  - `text-xs`: 12px â€” notas al pie, ayudas contextuales.
  - `text-sm`: 14px â€” texto secundario, labels de formulario.
  - `text-base`: 16px â€” cuerpo principal, celdas de tabla.
  - `text-lg`: 18px â€” subtÃ­tulos, Ã©nfasis.
  - `text-xl`: 20px â€” tÃ­tulos de cards.

### Monoespaciada (para cÃ³digos y montos)
- **Fuente:** `JetBrains Mono` (opcional, si se necesita alinear montos en tablas).
- **Uso:** NÃºmeros de folio, cÃ³digos de reserva, montos en tablas financieras.

---

## 3. Layout y estructura

- **Contenedor global (`.container-hotel`):** `max-width: 1280px`, `padding-inline: 1.5rem` (24px).
- **Sidebar:** 240px de ancho en desktop, colapsable a 64px. Fondo `navy-dark`, texto `cream`.
- **Topbar:** 64px de alto, fondo `navy`, texto `cream`. Contiene usuario, rol y notificaciones.
- **Contenido:** fondo `cream`, cards con fondo `cream-dark` y bordes sutiles.
- **Ritmo vertical:**
  - `.section-pad`: `6rem` (96px) arriba/abajo â€” para pÃ¡ginas de dashboard.
  - `.section-pad-sm`: `4rem` (64px) â€” para pÃ¡ginas de formulario.
- **Grid:** 12 columnas en desktop, 1 columna en mÃ³vil.
- **Breakpoints:** `sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`.

---

## 4. Componentes base

### 4.1 Botones

**Primario (`.btn-primary`):**
- Fondo: gradiente `gold-dark` â†’ `gold`.
- Texto: `navy-dark`.
- Border-radius: `rounded-lg` (8px).
- Sombra: `rgba(200, 169, 110, 0.3)`.
- Hover: `gold-dark` sÃ³lido.
- Uso: acciones principales (Check-in, Cobrar, Cerrar caja).

**Secundario / Outline (`.btn-outline`):**
- Borde: 1.5px `gold`.
- Fondo: transparente.
- Texto: `gold` (sobre fondos navy) o `stone` (sobre fondos cream).
- Hover: fondo `gold` sÃ³lido, texto `navy-dark`.
- Uso: acciones secundarias (Cancelar, Volver).

**Destructivo (`.btn-destructive`):**
- Fondo: `error`.
- Texto: blanco.
- Uso: anular venta, eliminar registro (con confirmaciÃ³n).

**WhatsApp (`.btn-whatsapp`):**
- Fondo: `#25d366`.
- Texto: blanco.
- Sombra difusa y animaciÃ³n de pulso opcional.
- Uso: enviar mensaje de bienvenida al huÃ©sped.

**TamaÃ±os:** `sm` (32px alto), `md` (40px), `lg` (48px).

### 4.2 Inputs y formularios

- **Altura:** 40px.
- **Fondo:** `cream` (o `white` si el formulario estÃ¡ sobre `cream-dark`).
- **Borde:** 1px `gold` (10% opacidad) o `cream-dark`.
- **Focus:** borde `gold`, ring de 2px `rgba(200, 169, 110, 0.2)`.
- **Label:** `DM Sans`, `text-sm`, color `stone`.
- **Error:** borde `error`, mensaje debajo en `text-sm` `error`.

### 4.3 Cards (`.glass-card`)

- **Fondo:** `rgba(255, 255, 255, 0.08)` si estÃ¡ sobre fondo navy; `cream-dark` si estÃ¡ sobre fondo claro.
- **Backdrop-blur:** 12px (solo en cards sobre navy).
- **Borde:** `rgba(200, 169, 110, 0.2)`.
- **Border-radius:** `1rem` (16px).
- **Padding:** 24px (16px en mÃ³vil).
- **Uso:** cards de KPI en dashboard, cards de habitaciÃ³n, cards de resumen.

### 4.4 Tablas

- **Header:** fondo `navy`, texto `cream`, `DM Sans`, `text-sm`, `font-semibold`.
- **Filas:** borde inferior `cream-dark`, hover `cream-dark` con opacidad 50%.
- **Celdas:** `text-base`, padding 12px, color `stone`.
- **Montos:** alineados a la derecha, fuente monoespaciada si estÃ¡ disponible.
- **Estados por fila:** badge de estado (ver 4.5).

### 4.5 Badges de estado

- **Disponible / Pagada / Check-in exitoso:** fondo `success/10`, texto `success`.
- **Ocupada / Pendiente / Diferencia de caja:** fondo `warning/10`, texto `warning`.
- **Vencida / Error / Anulada:** fondo `error/10`, texto `error`.
- **Neutral / Info:** fondo `cream-dark`, texto `stone-light`.
- **CortesÃ­a / Descuento:** fondo `gold/10`, texto `gold-dark`.

### 4.6 Modales

- **Overlay:** `navy-dark` con opacidad 70%.
- **Contenedor:** fondo `cream`, `rounded-lg`, sombra `shadow-xl`.
- **Header:** tÃ­tulo en `Playfair Display`, `text-xl`, color `stone`.
- **Footer:** botones alineados a la derecha (Outline + Primary).

### 4.7 Divisores editoriales (`.gold-divider`)

- LÃ­nea de 1px con gradiente de `transparent` â†’ `gold` â†’ `transparent`.
- Uso: separar secciones en el dashboard, separar grupos de campos en formularios largos.

---

## 5. Motion y microinteracciones

- **LibrerÃ­a recomendada:** `motion/react` (Framer Motion) para React, mÃ¡s CSS keyframes para animaciones simples.
- **Entrada estÃ¡ndar (FadeInUp):**
  - Desplazamiento en eje Y: 40px â†’ 0.
  - Curva: `ease: [0.22, 1, 0.36, 1]`.
  - DuraciÃ³n: 0.7s.
  - Uso: cards de dashboard, modales, toasts.
- **Marquee mÃ³vil (si se necesita para anuncios):** carrusel continuo infinito de 18s linear, con mÃ¡scara de degradado en los extremos.
- **Feedback de acciones:** toasts de 3s para confirmaciones (success, error, warning).

---

## 6. Accesibilidad

- **Contraste mÃ­nimo:** 4.5:1 para texto normal, 3:1 para texto grande.
- **Focus visible:** ring de 2px `gold` en todos los elementos interactivos.
- **Labels:** todo input tiene `<label>` asociado.
- **Botones con icono:** `aria-label` obligatorio.
- **Mensajes de error:** asociados con `aria-describedby`.

---

## 7. Modo oscuro (postergado a Fase 1C)

**DecisiÃ³n:** No se implementa en Fase 1A. Se posterga a Fase 1C.

Cuando se implemente:
- Usar `darkMode: 'class'` de Tailwind.
- Invertir la paleta: fondos `navy-dark`/`navy`, texto `cream`, acentos `gold`.
- Toggle en topbar, persistido en localStorage.

---

## 8. ImpresiÃ³n

### Tirilla tÃ©rmica (80mm)
- **Fuente:** monoespaciada, 12pt.
- **Encabezado:** nombre del hotel + NIT + direcciÃ³n.
- **Cuerpo:** detalle de Ã­tems, subtotal, impuestos, total.
- **Footer:** mensaje de agradecimiento.
- **Corte:** automÃ¡tico al final.

### PDF (A4)
- **MÃ¡rgenes:** 20mm.
- **Encabezado:** logo del hotel + nombre.
- **Cuerpo:** tabla de datos con colores suaves (header `navy` con texto `cream`).
- **Footer:** nÃºmero de pÃ¡gina + fecha de generaciÃ³n.

---

## 9. Principios de diseÃ±o para el sistema operativo

1. **Simplicidad operativa:** cada acciÃ³n frecuente en 2 clics o menos.
2. **Claridad financiera:** los montos siempre visibles, formato `$X.XXX,XX`.
3. **Feedback inmediato:** toda acciÃ³n tiene confirmaciÃ³n visual (toast).
4. **Consistencia:** los mismos patrones en todo el sistema.
5. **Accesibilidad:** nunca sacrificar legibilidad por estÃ©tica.
6. **Identidad:** la UI operativa usa la misma paleta y tipografÃ­a que la web pÃºblica, pero con mÃ¡s Ã©nfasis en la funcionalidad que en lo editorial.