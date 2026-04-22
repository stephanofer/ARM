# 🐛 Code Review - Bugs y Correcciones Pre-Entrega

> **Fecha de revisión:** Pre-entrega del proyecto  
> **Objetivo:** Identificar bugs funcionales que afecten el correcto funcionamiento del sistema  
> **Nota:** NO incluye micro-optimizaciones, solo bugs que pueden causar fallos

---

## 🔴 CRÍTICO - Corregir antes de entregar

### 1. PageSize de testing en producción

**Archivos afectados:**
- `src/lib/data/products.ts` (línea 15)
- `src/stores/filtersStore.ts` (línea 24)
- `src/config.ts` (línea 1)

**Problema:** El sistema está configurado con `pageSize: 2` que es un valor de prueba. En producción esto hará que:
- Los usuarios vean solo 2 productos por página
- La paginación sea excesiva (muchas páginas)
- Mala experiencia de usuario

**Correcciones necesarias:**

```typescript
// src/config.ts - ANTES
export const PAGE_SIZE = 4;

// src/config.ts - DESPUÉS (cambiar a valor de producción)
export const PAGE_SIZE = 12; // o 16, 20, 24 según diseño
```

```typescript
// src/lib/data/products.ts - ANTES (línea 15)
const DEFAULT_PAGE_SIZE = 2; // Para testear paginación

// src/lib/data/products.ts - DESPUÉS
const DEFAULT_PAGE_SIZE = 12; // Producción
```

```typescript
// src/stores/filtersStore.ts - ANTES (línea 24)
pageSize: 2, // Para testear paginación

// src/stores/filtersStore.ts - DESPUÉS
pageSize: 12, // Producción
```

**Acción:** Cambiar todos los valores a `12` (o el valor que prefieran para producción).

---

### 2. Console.log en código de producción

**Archivo afectado:** `src/lib/data/products.ts` (líneas 54 y 57)

**Problema:** Hay `console.log` de debugging en la función `applyFilters()`:

```typescript
// línea 54
console.log(Object.entries(filters.attributeFilters));

// línea 57
console.log('Applying attribute filter for', key, 'with values', value);
```

**Por qué es un problema:**
- Expone información de filtros en la consola del navegador (visible para usuarios)
- Puede revelar estructura de datos interna
- En SSR, llena los logs del servidor innecesariamente

**Corrección:** Eliminar o comentar estas líneas:

```typescript
// ANTES
if (filters.attributeFilters) {
    console.log(Object.entries(filters.attributeFilters));
    Object.entries(filters.attributeFilters).forEach(([key, value]) => {
      if (Array.isArray(value) && value.length > 0) {
        console.log('Applying attribute filter for', key, 'with values', value);

// DESPUÉS
if (filters.attributeFilters) {
    Object.entries(filters.attributeFilters).forEach(([key, value]) => {
      if (Array.isArray(value) && value.length > 0) {
```

---

## 🟡 IMPORTANTE - Revisar

### 3. Import no usado en PlaceOrderButton

**Archivo:** `src/components/PlaceOrderButton/PlaceOrderButton.tsx` (línea 4)

**Problema:**
```typescript
import { object } from "astro:schema"; // ← Import no usado
```

**Corrección:** Eliminar esta línea.

---

### 4. Inconsistencia de PageSize entre componentes

**Problema:** Hay múltiples valores de `pageSize` en diferentes archivos:
- `src/config.ts`: `PAGE_SIZE = 4`
- `src/lib/data/products.ts`: `DEFAULT_PAGE_SIZE = 2`
- `src/stores/filtersStore.ts`: `pageSize: 2`
- `src/stores/productsStore.ts`: `pageSize: 24`
- `src/pages/admin/productos/index.astro`: `pageSize: 20`

**Recomendación:** Centralizar en `src/config.ts`:

```typescript
// src/config.ts
export const PAGE_SIZE = 12;          // Catálogo público
export const ADMIN_PAGE_SIZE = 20;    // Panel admin
```

Luego importar desde config en todos los demás archivos.

---

### 5. Número de WhatsApp hardcodeado

**Archivo:** `src/components/PlaceOrderButton/PlaceOrderButton.tsx` (línea 8)

**Código actual:**
```typescript
const phone = "51981314610"; // tu número
```

**Recomendación:** Mover a configuración o variables de entorno:

```typescript
// src/config.ts
export const WHATSAPP_NUMBER = import.meta.env.PUBLIC_WHATSAPP_NUMBER || "51981314610";

// PlaceOrderButton.tsx
import { WHATSAPP_NUMBER } from "@/config";
const phone = WHATSAPP_NUMBER;
```

---

## 🟢 MENOR - Opcional

### 6. Console.error sin manejo estructurado

**Archivos afectados:**
- `src/pages/api/admin/products/[id].ts`
- `src/pages/api/admin/products/index.ts`
- `src/lib/data/products.ts`

**Problema:** Hay múltiples `console.error` que están bien para desarrollo, pero en producción deberían usar un servicio de logging estructurado.

**Por ahora:** Está bien dejarlos, pero considerar para futuro.

---

## ✅ Resumen de Correcciones Obligatorias

| # | Archivo | Línea | Acción |
|---|---------|-------|--------|
| 1 | `src/config.ts` | 1 | Cambiar `PAGE_SIZE = 4` a `12` |
| 2 | `src/lib/data/products.ts` | 15 | Cambiar `DEFAULT_PAGE_SIZE = 2` a `12` |
| 3 | `src/stores/filtersStore.ts` | 24 | Cambiar `pageSize: 2` a `12` |
| 4 | `src/lib/data/products.ts` | 54 | Eliminar `console.log(...)` |
| 5 | `src/lib/data/products.ts` | 57 | Eliminar `console.log(...)` |
| 6 | `src/components/PlaceOrderButton/PlaceOrderButton.tsx` | 4 | Eliminar import no usado |

---

## 📝 Script de corrección rápida

Si tienes acceso a terminal, puedes ejecutar estas correcciones manualmente:

1. **config.ts**: Abrir y cambiar `4` a `12`
2. **products.ts**: 
   - Línea 15: cambiar `2` a `12`
   - Líneas 54 y 57: eliminar los console.log
3. **filtersStore.ts**: Línea 24, cambiar `2` a `12`
4. **PlaceOrderButton.tsx**: Eliminar línea 4 (import object)

---

## ✅ Lo que está BIEN

Después de revisar el código, estas áreas están correctamente implementadas:

1. ✅ **Validación de cantidades en carrito** - `clampQuantity()` valida 1-99 correctamente
2. ✅ **Sanitización de parámetros URL** - `sanitizeUrlParams()` está bien implementada
3. ✅ **AbortController para race conditions** - El catálogo maneja correctamente peticiones canceladas
4. ✅ **Validación de autenticación en APIs** - Todos los endpoints admin verifican `user`
5. ✅ **Manejo de errores en APIs** - Try/catch con responses apropiados
6. ✅ **RLS policies** - Según los SQL, las políticas están configuradas
7. ✅ **Validación de tipos de archivo** - ProductForm valida MIME types correctamente
8. ✅ **Manejo de assets** - La lógica de primary/secondary está bien
9. ✅ **Sincronización URL ↔ Store** - El patrón de URL como fuente de verdad está correcto

---

**Tiempo estimado de corrección:** 5-10 minutos

¿Necesitas que aplique estas correcciones automáticamente?
