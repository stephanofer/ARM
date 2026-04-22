# 📋 GUÍA DE PRUEBAS MANUALES - SISTEMA ARM
## PARTE 3: CATÁLOGO PÚBLICO - NAVEGACIÓN Y LISTADO

---

## 🎯 OBJETIVO DE ESTA PARTE

Probar el frontend público del catálogo: navegación por categorías, listado de productos, visualización correcta de cards, imágenes y datos.

---

## 🔍 ENTENDIENDO EL SISTEMA DE BÚSQUEDA Y FILTROS

### 📚 ARQUITECTURA DEL SISTEMA

El sistema usa una arquitectura de **Store + URL Sync + API**:

```
┌─────────────┐
│   USUARIO   │ Cambia filtro/página
└──────┬──────┘
       ↓
┌─────────────────────────────────────┐
│  filtersStore (Nanostores)          │
│  - Mantiene estado de filtros       │
│  - Se sincroniza con URL            │
└──────┬──────────────────────────────┘
       ↓
┌─────────────────────────────────────┐
│  URL (Query Params)                 │
│  /categorias/oficina?               │
│    subcategoria=escritorios&        │
│    material=Madera&                 │
│    page=2&sort=price_asc            │
└──────┬──────────────────────────────┘
       ↓
┌─────────────────────────────────────┐
│  CategoryPageShell.tsx              │
│  - Escucha cambios en filtersStore  │
│  - Actualiza URL                    │
│  - Hace fetch a la API              │
└──────┬──────────────────────────────┘
       ↓
┌─────────────────────────────────────┐
│  API: /categorias/[categorySlug]    │
│  - Lee query params                 │
│  - Llama a getProductsByCategory()  │
│    o getProductsBySubcategory()     │
└──────┬──────────────────────────────┘
       ↓
┌─────────────────────────────────────┐
│  products.ts - Función applyFilters │
│  ✅ FUNCIÓN CLAVE DE BÚSQUEDA       │
└──────┬──────────────────────────────┘
       ↓
┌─────────────────────────────────────┐
│  Supabase Query                     │
│  - Filtra por precio (gte/lte)     │
│  - Filtra por stock (gt 0)         │
│  - Filtra por attributes (JSONB)   │
│  - Ordena según sort                │
│  - Aplica paginación (range)       │
└──────┬──────────────────────────────┘
       ↓
┌─────────────────────────────────────┐
│  Respuesta con Productos            │
│  {items, page, total, totalPages}   │
└──────┬──────────────────────────────┘
       ↓
┌─────────────────────────────────────┐
│  enrichProductsWithImages()         │
│  - Busca primary/secondary images   │
│  - Agrega URLs públicas             │
└──────┬──────────────────────────────┘
       ↓
┌─────────────────────────────────────┐
│  ProductsGrid → ProductCard         │
│  - Renderiza cada producto          │
│  - Muestra imagen con hover effect  │
└─────────────────────────────────────┘
```

---

### 🔑 FUNCIÓN CLAVE: `applyFilters()`

**Ubicación**: `/src/lib/data/products.ts` (líneas 31-100)

Esta función es el **corazón del sistema de filtrado**. Recibe una query de Supabase y le aplica todos los filtros:

```typescript
function applyFilters(query: any, filters: ProductFilters): any {
  // 1️⃣ FILTRO DE PRECIO
  if (filters.minPrice !== undefined) {
    query = query.gte('price', filters.minPrice);  // Mayor o igual
  }
  if (filters.maxPrice !== undefined) {
    query = query.lte('price', filters.maxPrice);  // Menor o igual
  }

  // 2️⃣ FILTRO DE STOCK
  if (filters.inStock) {
    query = query.gt('stock', 0);  // Stock mayor a 0
  }

  // 3️⃣ FILTROS DE ATRIBUTOS (DINÁMICOS - JSONB)
  if (filters.attributeFilters) {
    Object.entries(filters.attributeFilters).forEach(([key, value]) => {
      if (Array.isArray(value) && value.length > 0) {
        // Checkbox: OR entre valores
        // Ej: material=["Madera","Metal"] 
        // → WHERE attributes->material = "Madera" OR attributes->material = "Metal"
        const conditions = value.map(v => 
          `attributes->${key}.eq."${v.replace(/"/g, '\\"')}"`
        ).join(',');
        query = query.or(conditions);
      } else if (value === 'true' || value === 'false') {
        // Boolean: true/false
        query = query.eq(`attributes->${key}`, value === 'true');
      } else if (typeof value === 'string' && value) {
        // Select: valor único
        query = query.contains('attributes', { [key]: value });
      }
    });
  }

  // 4️⃣ ORDENAMIENTO
  switch (filters.sort) {
    case 'price_asc':
      query = query.order('price', { ascending: true, nullsFirst: false });
      break;
    case 'price_desc':
      query = query.order('price', { ascending: false, nullsFirst: false });
      break;
    case 'name_asc':
      query = query.order('name', { ascending: true });
      break;
    case 'name_desc':
      query = query.order('name', { ascending: false });
      break;
    default:
      query = query.order('created_at', { ascending: false });
  }
  
  // Siempre agregar id como desempate para consistencia
  query = query.order('id', { ascending: true });

  return query;
}
```

**Nota Importante**: Los filtros de atributos se aplican sobre el campo JSONB `attributes` de la tabla `products`. Cada producto tiene atributos dinámicos que corresponden a los filtros configurados en su subcategoría.

---

## 📦 SECCIÓN 5: NAVEGACIÓN Y LISTADO BÁSICO

### PRE-REQUISITOS
- Haber completado Partes 1 y 2
- Tener categorías con subcategorías creadas
- Tener AL MENOS 10-15 productos creados con imágenes
- Productos distribuidos en diferentes subcategorías
- Sistema corriendo en `http://localhost:4321`

---

-