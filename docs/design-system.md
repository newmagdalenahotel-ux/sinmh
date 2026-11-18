# Design System — Hotel New Magdalena

**Versión:** 2.0  
**Fecha:** 2026-11-13  
**Estado:** Validado — basado en la identidad visual oficial del hotel

---

## 1. Paleta de colores (tokens)

### Navy — Fondos estructurales e identidad
| Token | HEX | Uso en el sistema |
|---|---|---|
| `navy-dark` | `#060f1e` | Sidebar, topbar, fondos de modales oscuros, headers de tabla |
| `navy` | `#0b1d3a` | Fondo de secciones alternas, cards de dashboard |
| `navy-light` | `#152d5a` | Hover de elementos navy, bordes de separación |

### Gold — Acentos y jerarquía
| Token | HEX | Uso en el sistema |
|---|---|---|
| `gold-light` | `#e0c99a` | Texto secundario sobre fondos navy, divisores |
| `gold` | `#c8a96e` | Botones primarios, links, badges de estado activo, iconos destacados |
| `gold-dark` | `#9e7d46` | Hover de botones primarios, sombras de elementos gold |

### Neutros y superficies
| Token | HEX | Uso en el sistema |
|---|---|---|
| `cream` | `#faf6f0` | Fondo de página principal, fondo de formularios |
| `cream-dark` | `#f0e8d8` | Fondo de cards, filas alternas de tabla |
| `stone` | `#4a4a4a` | Texto principal sobre fondos claros |
| `stone-light` | `#7a7a7a` | Texto secundario, placeholders, labels |

### Semánticos (para estados operativos)
| Token | HEX | Uso |
|---|---|---|
| `success` | `#10B981` | Check-in exitoso, pago registrado, folio cerrado correctamente |
| `warning` | `#F59E0B` | Saldo pendiente, habitación por limpiar, diferencia de caja |
| `error` | `#EF4444` | Error de validación, cuenta vencida, faltante de caja |
| `info` | `#3B82F6` | Mensajes informativos, tooltips |

---

## 2. Tipografía

### Display (títulos y acentos editoriales)
- **Fuente:** `Playfair Display` (serif)
- **Uso en el sistema:** Encabezados de página (`h1`, `h2`), títulos de modales, cifras destacadas del dashboard (KPIs).
- **Pesos:** 400 (regular), 600 (semibold), 700 (bold).
- **Escala:**
  - `display-xl`: `clamp(2.5rem, 6vw, 5rem)` — solo para el dashboard principal.
  - `display-md`: `clamp(2rem, 4vw, 3.5rem)` — títulos de página.
  - `section-title`: `clamp(1.75rem, 3vw, 2.75rem)` — títulos de sección.

### Body (lectura, interfaces y micro-copia)
- **Fuente:** `DM Sans` (sans-serif)
- **Uso en el sistema:** Párrafos, botones, inputs, tablas, mensajes de error, tooltips.
- **Pesos:** 400 (regular), 500 (medium), 700 (bold).
- **Escala:**
  - `text-xs`: 12px — notas al pie, ayudas contextuales.
  - `text-sm`: 14px — texto secundario, labels de formulario.
  - `text-base`: 16px — cuerpo principal, celdas de tabla.
  - `text-lg`: 18px — subtítulos, énfasis.
  - `text-xl`: 20px — títulos de cards.

### Monoespaciada (para códigos y montos)
- **Fuente:** `JetBrains Mono` (opcional, si se necesita alinear montos en tablas).
- **Uso:** Números de folio, códigos de reserva, montos en tablas financieras.

---

## 3. Layout y estructura

- **Contenedor global (`.container-hotel`):** `max-width: 1280px`, `padding-inline: 1.5rem` (24px).
- **Sidebar:** 240px de ancho en desktop, colapsable a 64px. Fondo `navy-dark`, texto `cream`.
- **Topbar:** 64px de alto, fondo `navy`, texto `cream`. Contiene usuario, rol y notificaciones.
- **Contenido:** fondo `cream`, cards con fondo `cream-dark` y bordes sutiles.
- **Ritmo vertical:**
  - `.section-pad`: `6rem` (96px) arriba/abajo — para páginas de dashboard.
  - `.section-pad-sm`: `4rem` (64px) — para páginas de formulario.
- **Grid:** 12 columnas en desktop, 1 columna en móvil.
- **Breakpoints:** `sm: 640px`, `md: 768px`, `lg: 1024px`, `xl: 1280px`.

---

## 4. Componentes base

### 4.1 Botones

**Primario (`.btn-primary`):**
- Fondo: gradiente `gold-dark` → `gold`.
- Texto: `navy-dark`.
- Border-radius: `rounded-lg` (8px).
- Sombra: `rgba(200, 169, 110, 0.3)`.
- Hover: `gold-dark` sólido.
- Uso: acciones principales (Check-in, Cobrar, Cerrar caja).

**Secundario / Outline (`.btn-outline`):**
- Borde: 1.5px `gold`.
- Fondo: transparente.
- Texto: `gold` (sobre fondos navy) o `stone` (sobre fondos cream).
- Hover: fondo `gold` sólido, texto `navy-dark`.
- Uso: acciones secundarias (Cancelar, Volver).

**Destructivo (`.btn-destructive`):**
- Fondo: `error`.
- Texto: blanco.
- Uso: anular venta, eliminar registro (con confirmación).

**WhatsApp (`.btn-whatsapp`):**
- Fondo: `#25d366`.
- Texto: blanco.
- Sombra difusa y animación de pulso opcional.
- Uso: enviar mensaje de bienvenida al huésped.

**Tamaños:** `sm` (32px alto), `md` (40px), `lg` (48px).

### 4.2 Inputs y formularios

- **Altura:** 40px.
- **Fondo:** `cream` (o `white` si el formulario está sobre `cream-dark`).
- **Borde:** 1px `gold` (10% opacidad) o `cream-dark`.
- **Focus:** borde `gold`, ring de 2px `rgba(200, 169, 110, 0.2)`.
- **Label:** `DM Sans`, `text-sm`, color `stone`.
- **Error:** borde `error`, mensaje debajo en `text-sm` `error`.

### 4.3 Cards (`.glass-card`)

- **Fondo:** `rgba(255, 255, 255, 0.08)` si está sobre fondo navy; `cream-dark` si está sobre fondo claro.
- **Backdrop-blur:** 12px (solo en cards sobre navy).
- **Borde:** `rgba(200, 169, 110, 0.2)`.
- **Border-radius:** `1rem` (16px).
- **Padding:** 24px (16px en móvil).
- **Uso:** cards de KPI en dashboard, cards de habitación, cards de resumen.

### 4.4 Tablas

- **Header:** fondo `navy`, texto `cream`, `DM Sans`, `text-sm`, `font-semibold`.
- **Filas:** borde inferior `cream-dark`, hover `cream-dark` con opacidad 50%.
- **Celdas:** `text-base`, padding 12px, color `stone`.
- **Montos:** alineados a la derecha, fuente monoespaciada si está disponible.
- **Estados por fila:** badge de estado (ver 4.5).

### 4.5 Badges de estado

- **Disponible / Pagada / Check-in exitoso:** fondo `success/10`, texto `success`.
- **Ocupada / Pendiente / Diferencia de caja:** fondo `warning/10`, texto `warning`.
- **Vencida / Error / Anulada:** fondo `error/10`, texto `error`.
- **Neutral / Info:** fondo `cream-dark`, texto `stone-light`.
- **Cortesía / Descuento:** fondo `gold/10`, texto `gold-dark`.

### 4.6 Modales

- **Overlay:** `navy-dark` con opacidad 70%.
- **Contenedor:** fondo `cream`, `rounded-lg`, sombra `shadow-xl`.
- **Header:** título en `Playfair Display`, `text-xl`, color `stone`.
- **Footer:** botones alineados a la derecha (Outline + Primary).

### 4.7 Divisores editoriales (`.gold-divider`)

- Línea de 1px con gradiente de `transparent` → `gold` → `transparent`.
- Uso: separar secciones en el dashboard, separar grupos de campos en formularios largos.

---

## 5. Motion y microinteracciones

- **Librería recomendada:** `motion/react` (Framer Motion) para React, más CSS keyframes para animaciones simples.
- **Entrada estándar (FadeInUp):**
  - Desplazamiento en eje Y: 40px → 0.
  - Curva: `ease: [0.22, 1, 0.36, 1]`.
  - Duración: 0.7s.
  - Uso: cards de dashboard, modales, toasts.
- **Marquee móvil (si se necesita para anuncios):** carrusel continuo infinito de 18s linear, con máscara de degradado en los extremos.
- **Feedback de acciones:** toasts de 3s para confirmaciones (success, error, warning).

---

## 6. Accesibilidad

- **Contraste mínimo:** 4.5:1 para texto normal, 3:1 para texto grande.
- **Focus visible:** ring de 2px `gold` en todos los elementos interactivos.
- **Labels:** todo input tiene `<label>` asociado.
- **Botones con icono:** `aria-label` obligatorio.
- **Mensajes de error:** asociados con `aria-describedby`.

---

## 7. Modo oscuro (postergado a Fase 1C)

**Decisión:** No se implementa en Fase 1A. Se posterga a Fase 1C.

Cuando se implemente:
- Usar `darkMode: 'class'` de Tailwind.
- Invertir la paleta: fondos `navy-dark`/`navy`, texto `cream`, acentos `gold`.
- Toggle en topbar, persistido en localStorage.

---

## 8. Impresión

### Tirilla térmica (80mm)
- **Fuente:** monoespaciada, 12pt.
- **Encabezado:** nombre del hotel + NIT + dirección.
- **Cuerpo:** detalle de ítems, subtotal, impuestos, total.
- **Footer:** mensaje de agradecimiento.
- **Corte:** automático al final.

### PDF (A4)
- **Márgenes:** 20mm.
- **Encabezado:** logo del hotel + nombre.
- **Cuerpo:** tabla de datos con colores suaves (header `navy` con texto `cream`).
- **Footer:** número de página + fecha de generación.

---

## 9. Principios de diseño para el sistema operativo

1. **Simplicidad operativa:** cada acción frecuente en 2 clics o menos.
2. **Claridad financiera:** los montos siempre visibles, formato `$X.XXX,XX`.
3. **Feedback inmediato:** toda acción tiene confirmación visual (toast).
4. **Consistencia:** los mismos patrones en todo el sistema.
5. **Accesibilidad:** nunca sacrificar legibilidad por estética.
6. **Identidad:** la UI operativa usa la misma paleta y tipografía que la web pública, pero con más énfasis en la funcionalidad que en lo editorial.