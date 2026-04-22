# 📚 Sistema de Catálogo - Documentación Completa

## 📖 Índice

1. [Introducción](#-introducción)
2. [Arquitectura General](#-arquitectura-general)
3. [Flujo de Datos](#-flujo-de-datos-el-viaje-de-un-producto)
4. [Estructura de Archivos](#-estructura-de-archivos)
5. [Tipos de Datos](#-tipos-de-datos)
6. [Stores (Estado Global)](#-stores-estado-global)
7. [Componentes del Catálogo](#-componentes-del-catálogo)
8. [API de Productos](#-api-de-productos)
9. [Funciones de Datos](#-funciones-de-datos)
10. [Página de Producto Individual](#-página-de-producto-individual)
11. [Patrones y Mejores Prácticas](#-patrones-y-mejores-prácticas)
12. [Ejemplos Prácticos](#-ejemplos-prácticos)
13. [Troubleshooting](#-troubleshooting)

---

## 🎯 Introducción

### ¿Qué es este sistema?

Este es un **sistema de catálogo de productos** construido con:

- **Astro** - Framework para páginas estáticas con islas interactivas
- **Preact** - Librería UI ligera (alternativa a React)
- **Nanostores** - Gestión de estado minimalista
- **Supabase** - Backend (base de datos + storage)

### ¿Por qué es complejo?

El sistema maneja varias responsabilidades simultáneas:

```
┌─────────────────────────────────────────────────────────────────┐
│                      SISTEMA DE CATÁLOGO                         │
├─────────────────────────────────────────────────────────────────┤
│  1. Renderizado inicial en servidor (SSR) → SEO + Performance   │
│  2. Hidratación en cliente → Interactividad                     │
│  3. Sincronización URL ↔ Estado ↔ UI                           │
│  4. Filtrado y paginación en tiempo real                        │
│  5. Cache de datos para evitar requests innecesarios            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🏗️ Arquitectura General

### Diagrama de Capas

```
┌─────────────────────────────────────────────────────────────┐
│                        USUARIO                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    URL DEL NAVEGADOR                         │
│  /categorias/dormitorio?subcategoria=camas&page=2&sort=...  │
└─────────────────────────────────────────────────────────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
┌─────────────────────────┐     ┌─────────────────────────┐
│     PÁGINA ASTRO        │     │    API ENDPOINT         │
│  [categorySlug].astro   │     │   /api/products.ts      │
│  (Carga inicial SSR)    │     │  (Cambios dinámicos)    │
└─────────────────────────┘     └─────────────────────────┘
              │                               │
              └───────────────┬───────────────┘
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    FUNCIONES DE DATOS                        │
│              lib/data/products.ts                            │
│              lib/data/categories.ts                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       SUPABASE                               │
│            Base de datos + Storage de imágenes               │
└─────────────────────────────────────────────────────────────┘
```

### Flujo SSR vs CSR

```
CARGA INICIAL (SSR - Server Side Rendering)
============================================
1. Usuario visita /categorias/dormitorio
2. Astro ejecuta [categorySlug].astro en el SERVIDOR
3. Se consulta Supabase directamente
4. Se renderiza HTML completo con productos
5. El navegador recibe HTML listo para mostrar
6. ✅ Beneficio: SEO, carga rápida inicial

NAVEGACIÓN POSTERIOR (CSR - Client Side Rendering)
==================================================
1. Usuario cambia filtros o página
2. CategoryPageShell.tsx actualiza filtersStore
3. Se dispara fetch a /api/products
4. Se actualiza productsStore con nuevos datos
5. React/Preact re-renderiza solo lo necesario
6. ✅ Beneficio: Navegación fluida sin recargar página
```

---

## 🔄 Flujo de Datos: El Viaje de un Producto

Imagina que un usuario entra a la categoría "Dormitorio" y filtra por camas. Esto es lo que sucede:

### Paso 1: Carga Inicial

```typescript
// [categorySlug].astro - Se ejecuta en el servidor

// 1. Obtener el slug de la URL
const { categorySlug } = Astro.params; // "dormitorio"

// 2. Crear cliente Supabase
const supabase = createClient({
  request: Astro.request,
  cookies: Astro.cookies,
});

// 3. Obtener categoría + subcategorías
const categoryData = await getCategoryAndSubcategories(supabase, categorySlug);
// → { category: {...}, subcategories: [{camas}, {mesitas}, ...] }

// 4. Obtener productos iniciales
const productsResponse = await getProductsByCategory(
  supabase,
  category.id,
  filters,
  { page: 1, pageSize: 24 }
);

// 5. Enriquecer con URLs de imágenes
const enrichedProducts = await enrichProductsWithImages(
  supabase,
  productsResponse.items
);

// 6. Pasar todo al componente React/Preact
<CategoryPageShell
  client:load  // ← Esto significa "hidratar cuando la página cargue"
  category={category}
  subcategories={subcategories}
  initialProducts={enrichedProducts}
  initialFilters={initialFilters}
  initialPagination={initialPagination}
/>
```

### Paso 2: Hidratación en Cliente

```typescript
// CategoryPageShell.tsx - Se ejecuta en el navegador

// 1. Inicializar stores con datos del servidor
useEffect(() => {
  // Guardar filtros iniciales
  initFiltersStore({
    categorySlug: category.slug,
    subcategorySlug: initialFilters.subcategorySlug,
    page: initialFilters.page,
    // ...
  });

  // Guardar productos iniciales
  initProductsStore({
    items: initialProducts,
    page: initialPagination.page,
    total: initialPagination.total,
    // ...
  });

  setIsInitialized(true);
}, []);
```

### Paso 3: Usuario Cambia un Filtro

```typescript
// FiltersPanel.tsx - Usuario hace clic en "Camas"

const handleFilterChange = (key: string, value: string) => {
  setAttributeFilter(key, value);
  // Esto actualiza filtersStore
};

// setSubcategory("camas")
// → filtersStore se actualiza
// → Dispara el efecto en CategoryPageShell
```

### Paso 4: Sincronización URL + API

```typescript
// CategoryPageShell.tsx - Efecto que escucha cambios en filtros

useEffect(() => {
  // 1. Construir nueva URL
  const buildURL = () => {
    const params = new URLSearchParams();
    if (filters.subcategorySlug) {
      params.set("subcategoria", filters.subcategorySlug);
    }
    // ... más params
    return `/categorias/${category.slug}?${params.toString()}`;
  };

  // 2. Actualizar URL del navegador (sin recargar página)
  const newURL = buildURL();
  window.history.pushState({}, "", newURL);

  // 3. Hacer fetch a la API
  const fetchProducts = async () => {
    const response = await fetch(`/api/products?${apiParams.toString()}`);
    const data = await response.json();
    
    // 4. Actualizar store de productos
    productsStore.set({
      items: data.items,
      page: data.page,
      total: data.total,
      // ...
    });
  };

  fetchProducts();
}, [filters.subcategorySlug, filters.page, /*...más dependencias*/]);
```

---

## 📁 Estructura de Archivos

```
src/
├── pages/
│   ├── categorias/
│   │   ├── index.astro          # Lista de todas las categorías
│   │   └── [categorySlug].astro # Página de categoría (SSR)
│   ├── producto/
│   │   └── [productSlug].astro  # Página de producto individual
│   └── api/
│       └── products.ts          # Endpoint API para productos
│
├── components/
│   └── catalog/                 # Componentes del catálogo
│       ├── CategoryPageShell.tsx    # ⭐ Orquestador principal
│       ├── FiltersPanel.tsx         # Panel de filtros lateral
│       ├── ProductsGrid.tsx         # Grid de productos
│       ├── ProductCard.tsx          # Card de producto individual
│       ├── Pagination.tsx           # Paginación
│       ├── SortBar.tsx              # Barra de ordenamiento
│       ├── SubcategoryTabs.tsx      # Tabs de subcategorías
│       ├── EmptyState.tsx           # Estado vacío
│       └── ErrorState.tsx           # Estado de error
│
├── stores/                      # Estado global (Nanostores)
│   ├── filtersStore.ts          # Filtros activos
│   ├── productsStore.ts         # Lista de productos
│   └── catalogStore.ts          # Cache de datos
│
└── lib/
    └── data/                    # Funciones de acceso a datos
        ├── types.ts             # Tipos TypeScript
        ├── categories.ts        # Consultas de categorías
        └── products.ts          # Consultas de productos
```

---

## 📝 Tipos de Datos

### Tipos Principales

```typescript
// === CATEGORÍA ===
interface Category {
  id: number;
  name: string;           // "Dormitorio"
  slug: string;           // "dormitorio"
  image_url: string | null;
  created_at: string;
}

// === SUBCATEGORÍA ===
interface Subcategory {
  id: number;
  category_id: number;    // Referencia a Category
  name: string;           // "Camas"
  slug: string;           // "camas"
  filter_config: FilterConfig[];  // Configuración de filtros
  display_order: number;
  created_at: string;
}

// === PRODUCTO ===
interface Product {
  id: number;
  subcategory_id: number;
  category_id: number;
  name: string;           // "Cama Nórdica 150cm"
  slug: string;           // "cama-nordica-150cm"
  description: string | null;
  price: number | null;
  stock: number;
  brand: string | null;
  attributes: Record<string, any>;  // JSONB flexible
  created_at: string;
}

// Ejemplo de attributes:
// {
//   "material": "Madera de pino",
//   "color": "Natural",
//   "dimensiones": "150x200cm",
//   "montaje": "Requiere montaje"
// }
```

### Tipos de Filtros

```typescript
// Configuración de un filtro (viene de la BD)
interface FilterConfig {
  key: string;           // "material"
  label: string;         // "Material"
  type: "select" | "checkbox" | "range" | "boolean";
  options?: string[];    // ["Madera", "Metal", "Mixto"]
  min?: number;          // Para type "range"
  max?: number;
  step?: number;
}

// Filtros activos (seleccionados por el usuario)
interface AttributeFilters {
  [key: string]: string | string[];
  // Ejemplo: { material: "Madera", color: ["Blanco", "Natural"] }
}

// Opciones de ordenamiento
type SortOption =
  | "price_asc"    // Precio menor a mayor
  | "price_desc"   // Precio mayor a menor
  | "name_asc"     // A-Z
  | "name_desc";   // Z-A
```

### Tipos de Respuesta

```typescript
// Respuesta paginada de productos
interface PaginatedProductsResponse {
  items: Product[];
  page: number;         // Página actual
  pageSize: number;     // Items por página
  total: number | null; // Total de productos
  totalPages: number | null;
}

// Ejemplo:
// {
//   items: [...24 productos],
//   page: 2,
//   pageSize: 24,
//   total: 156,
//   totalPages: 7
// }
```

---

## 🗄️ Stores (Estado Global)

### ¿Qué es Nanostores?

Nanostores es una librería minimalista para gestión de estado. Funciona así:

```typescript
import { atom } from 'nanostores';

// Crear un store
const countStore = atom(0);

// Leer valor
const currentValue = countStore.get(); // 0

// Escribir valor
countStore.set(5);

// Suscribirse a cambios (en React/Preact)
import { useStore } from '@nanostores/preact';
const count = useStore(countStore); // Se actualiza automáticamente
```

### filtersStore - Filtros Activos

```typescript
// stores/filtersStore.ts

// Estado del store
interface FiltersState {
  categorySlug: string;              // "dormitorio"
  subcategorySlug: string | null;    // "camas" o null
  page: number;                      // 1, 2, 3...
  pageSize: number;                  // 24
  sort: SortOption | null;           // "price_asc" o null
  attributeFilters: AttributeFilters; // { material: "Madera" }
  minPrice?: number;
  maxPrice?: number;
  inStock: boolean;
}

// Funciones para modificar
export function setPage(page: number)
export function setSort(sort: SortOption | null)
export function setSubcategory(slug: string | null)
export function setAttributeFilter(key: string, value: string | string[])
export function resetFilters()  // Limpia todos los filtros
```

**Ejemplo de uso:**

```typescript
// En FiltersPanel.tsx
import { setSort, setSubcategory } from '@/stores/filtersStore';

// Usuario selecciona "Precio: Menor a Mayor"
<select onChange={(e) => setSort(e.target.value as SortOption)}>

// Usuario hace clic en subcategoría "Camas"
<button onClick={() => setSubcategory("camas")}>
```

### productsStore - Lista de Productos

```typescript
// stores/productsStore.ts

interface ProductsState {
  items: Product[];          // Lista de productos
  page: number;              // Página actual
  pageSize: number;          // Items por página
  total: number | null;      // Total de productos
  totalPages: number | null;
  isLoading: boolean;        // ¿Está cargando?
  error: string | null;      // Mensaje de error
}

// Funciones
export function initProductsStore(state: Partial<ProductsState>)
export function setProducts(data: {...})
export function setLoading(isLoading: boolean)
export function setError(error: string)
```

### catalogStore - Cache de Datos

```typescript
// stores/catalogStore.ts
// Guarda datos que no cambian frecuentemente para evitar re-fetching

interface CatalogState {
  // Subcategorías cacheadas por categoría
  subcategoriesByCategorySlug: Record<string, Subcategory[]>;
  
  // Configuración de filtros cacheada por subcategoría
  filterConfigBySubcategorySlug: Record<string, FilterConfig[]>;
}

// Funciones
export function cacheSubcategories(categorySlug: string, subcategories: Subcategory[])
export function getCachedSubcategories(categorySlug: string): Subcategory[] | null
export function cacheFilterConfig(subcategorySlug: string, config: FilterConfig[])
export function getCachedFilterConfig(subcategorySlug: string): FilterConfig[] | null
```

---

## 🧩 Componentes del Catálogo

### CategoryPageShell - El Orquestador

Este es el **componente más importante**. Coordina todo:

```typescript
// components/catalog/CategoryPageShell.tsx

export function CategoryPageShell({
  category,
  subcategories,
  currentSubcategory,
  filterConfig,
  initialProducts,
  initialFilters,
  initialPagination,
}: CategoryPageShellProps) {
  
  // 1. Leer estado de los stores
  const filters = useStore(filtersStore);
  const products = useStore(productsStore);
  
  // 2. Controlar inicialización
  const [isInitialized, setIsInitialized] = useState(false);
  
  // 3. Mostrar datos iniciales hasta que esté listo
  const displayProducts = isInitialized ? products.items : initialProducts;
  
  // 4. Inicializar stores al montar
  useEffect(() => {
    initFiltersStore({...});
    initProductsStore({...});
    setIsInitialized(true);
  }, []);
  
  // 5. Sincronizar filtros → URL → API
  useEffect(() => {
    // Construir URL
    // Actualizar history
    // Fetch a API
    // Actualizar productsStore
  }, [filters.subcategorySlug, filters.page, /*...*/]);
  
  // 6. Escuchar botón "atrás" del navegador
  useEffect(() => {
    const handlePopState = () => {
      // Leer URL actual
      // Actualizar filtersStore
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  
  return (
    <div className={styles.container}>
      {/* Sidebar con filtros */}
      <aside>
        <FiltersPanel
          filterConfig={currentFilterConfig}
          currentFilters={filters.attributeFilters}
          subcategories={subcategories}
          currentSubcategorySlug={filters.subcategorySlug}
        />
      </aside>
      
      {/* Contenido principal */}
      <main>
        <SortBar currentSort={filters.sort} totalResults={displayTotal} />
        
        {products.error && <ErrorState error={products.error} />}
        {displayProducts.length === 0 && <EmptyState />}
        
        <ProductsGrid products={displayProducts} isLoading={products.isLoading} />
        <Pagination currentPage={displayPage} totalPages={displayTotalPages} />
      </main>
    </div>
  );
}
```

### FiltersPanel - Panel de Filtros

```typescript
// components/catalog/FiltersPanel.tsx

export function FiltersPanel({
  filterConfig,      // Configuración de filtros disponibles
  currentFilters,    // Filtros actualmente seleccionados
  subcategories,     // Lista de subcategorías
  currentSubcategorySlug,
  isOpen,            // Para drawer en mobile
  onClose,           // Cerrar drawer
}: FiltersPanelProps) {
  
  // Verificar si hay filtros activos
  const hasFilters = useStore(hasActiveFilters);
  
  // Manejar cambio de filtro
  const handleFilterChange = (key: string, value: string) => {
    setAttributeFilter(key, value);
  };
  
  // Limpiar todos los filtros
  const handleReset = () => {
    resetFilters();
  };
  
  return (
    <>
      {/* Desktop: Panel normal */}
      <div className={styles["filters-sidebar"]}>
        <h3>Filtros</h3>
        <button onClick={handleReset} disabled={!hasFilters}>
          Limpiar Todo
        </button>
        
        {/* Lista de subcategorías */}
        {subcategories.map((sub) => (
          <a onClick={() => setSubcategory(sub.slug)}>{sub.name}</a>
        ))}
        
        {/* Filtros dinámicos según configuración */}
        {filterConfig.map((config) => (
          <div key={config.key}>
            <label>{config.label}</label>
            
            {config.type === "select" && (
              <select onChange={(e) => handleFilterChange(config.key, e.target.value)}>
                <option value="">Todos</option>
                {config.options?.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            )}
            
            {config.type === "checkbox" && (
              config.options?.map((opt) => (
                <label key={opt}>
                  <input type="checkbox" /*...*/ />
                  {opt}
                </label>
              ))
            )}
          </div>
        ))}
      </div>
      
      {/* Mobile: Drawer deslizable */}
      <div className={`${styles.mobileDrawer} ${isOpen ? styles.open : ''}`}>
        {/* Mismo contenido pero con botón cerrar */}
      </div>
    </>
  );
}
```

### ProductCard - Tarjeta de Producto

```typescript
// components/catalog/ProductCard.tsx

export function ProductCard({
  product,
  primaryImageUrl,     // URL de imagen principal
  secondaryImageUrl,   // URL de imagen secundaria (hover)
}: Props) {
  
  const productUrl = `/producto/${product.slug}`;
  const inStock = product.stock > 0;
  const displayBrand = product.brand || product.attributes.brand || 'ARM';
  
  return (
    <article className={styles["product-card"]}>
      <a href={productUrl}>
        <div className={styles["product-image-wrapper"]}>
          {/* Badge de agotado */}
          {!inStock && <span className={styles.badge}>Agotado</span>}
          
          {/* Imágenes con efecto hover */}
          <div className={styles["image-container"]}>
            {primaryImageUrl ? (
              <>
                <img src={primaryImageUrl} className={styles["primary-image"]} />
                {secondaryImageUrl && (
                  <img src={secondaryImageUrl} className={styles["secondary-image"]} />
                )}
              </>
            ) : (
              <div className={styles["no-image"]}>
                {/* Placeholder SVG */}
              </div>
            )}
          </div>
        </div>
        
        <div className={styles["product-info"]}>
          <span className={styles.brand}>{displayBrand}</span>
          <h3>{product.name}</h3>
          {product.description && <p>{product.description}</p>}
        </div>
      </a>
      
      {/* Botón agregar al carrito */}
      <AddToCartButton product={{...product, quantity: 1}} />
    </article>
  );
}
```

### Pagination - Paginación

```typescript
// components/catalog/Pagination.tsx

export function Pagination({
  currentPage,
  totalPages,
  isLoading,
}: PaginationProps) {
  
  // No mostrar si hay solo 1 página
  if (totalPages <= 1) return null;
  
  const handlePageClick = (page: number) => {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      setPage(page);  // Actualiza filtersStore
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };
  
  // Generar números de página con elipsis
  // Ejemplo: 1 ... 4 5 6 ... 20
  const renderPageNumbers = () => {
    const pages: (number | string)[] = [];
    
    if (totalPages <= 7) {
      // Mostrar todas: 1 2 3 4 5 6 7
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      // Lógica con elipsis...
      if (currentPage <= 4) {
        pages.push(1, 2, 3, 4, 5, "...", totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1, "...", ...);
      } else {
        pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
      }
    }
    return pages;
  };
  
  return (
    <nav aria-label="Paginación">
      <button onClick={() => handlePageClick(currentPage - 1)} disabled={currentPage === 1}>
        Anterior
      </button>
      
      {renderPageNumbers().map((page) => (
        page === "..." 
          ? <span>···</span>
          : <button onClick={() => handlePageClick(page)}>{page}</button>
      ))}
      
      <button onClick={() => handlePageClick(currentPage + 1)} disabled={currentPage === totalPages}>
        Siguiente
      </button>
    </nav>
  );
}
```

---

## 🔌 API de Productos

### Endpoint: `/api/products`

```typescript
// pages/api/products.ts

export const GET: APIRoute = async ({ request, cookies, url }) => {
  // 1. Crear cliente Supabase
  const supabase = createClient({ request, cookies });
  
  // 2. Leer y SANITIZAR parámetros
  const categorySlug = url.searchParams.get("categorySlug");
  
  // Sanitizar page (evitar NaN)
  const rawPage = url.searchParams.get("page");
  const parsedPage = rawPage ? parseInt(rawPage, 10) : 1;
  const page = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;
  
  // Sanitizar sort (solo valores permitidos)
  const VALID_SORT_OPTIONS = ["price_asc", "price_desc", "name_asc", "name_desc"];
  const rawSort = url.searchParams.get("sort");
  const sort = rawSort && VALID_SORT_OPTIONS.includes(rawSort) ? rawSort : undefined;
  
  // 3. Validar categoría obligatoria
  if (!categorySlug) {
    return new Response(
      JSON.stringify({ error: "categorySlug is required" }),
      { status: 400 }
    );
  }
  
  // 4. Obtener categoría de la BD
  const categoryData = await getCategoryAndSubcategories(supabase, categorySlug);
  
  if (!categoryData) {
    return new Response(
      JSON.stringify({ error: "Category not found" }),
      { status: 404 }
    );
  }
  
  // 5. Construir filtros de atributos desde query params
  const attributeFilters: AttributeFilters = {};
  const reservedParams = ["categorySlug", "subcategoria", "page", "sort", /*...*/];
  
  url.searchParams.forEach((value, key) => {
    if (!reservedParams.includes(key) && value) {
      // Soportar múltiples valores: ?color=rojo&color=azul
      if (attributeFilters[key]) {
        if (Array.isArray(attributeFilters[key])) {
          attributeFilters[key].push(value);
        } else {
          attributeFilters[key] = [attributeFilters[key], value];
        }
      } else {
        attributeFilters[key] = value;
      }
    }
  });
  
  // 6. Obtener productos (con o sin subcategoría)
  let productsResponse;
  
  if (subcategorySlug) {
    productsResponse = await getProductsBySubcategory(
      supabase, subcategory.id, filters, { page, pageSize }
    );
  } else {
    productsResponse = await getProductsByCategory(
      supabase, category.id, filters, { page, pageSize }
    );
  }
  
  // 7. Enriquecer con URLs de imágenes
  const enrichedProducts = await enrichProductsWithImages(
    supabase, productsResponse.items
  );
  
  // 8. Retornar respuesta JSON
  return new Response(JSON.stringify({
    items: enrichedProducts,
    page: productsResponse.page,
    total: productsResponse.total,
    totalPages: productsResponse.totalPages,
    // ...más datos
  }), {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
};
```

### Ejemplo de Request/Response

**Request:**
```
GET /api/products?categorySlug=dormitorio&subcategoria=camas&page=2&sort=price_asc&material=Madera
```

**Response:**
```json
{
  "items": [
    {
      "id": 45,
      "name": "Cama Nórdica 150",
      "slug": "cama-nordica-150",
      "price": 599.99,
      "primaryImageUrl": "https://...",
      "secondaryImageUrl": "https://..."
    },
    // ... más productos
  ],
  "page": 2,
  "pageSize": 24,
  "total": 156,
  "totalPages": 7,
  "category": {
    "id": 1,
    "name": "Dormitorio",
    "slug": "dormitorio"
  },
  "subcategory": {
    "id": 3,
    "name": "Camas",
    "slug": "camas"
  },
  "appliedFilters": {
    "subcategorySlug": "camas",
    "page": 2,
    "sort": "price_asc",
    "attributeFilters": { "material": "Madera" }
  }
}
```

---

## 📊 Funciones de Datos

### products.ts - Consultas de Productos

```typescript
// lib/data/products.ts

/**
 * Aplica filtros a una query de Supabase
 */
function applyFilters(query: any, filters: ProductFilters): any {
  // Filtro de precio
  if (filters.minPrice !== undefined) {
    query = query.gte('price', filters.minPrice);
  }
  if (filters.maxPrice !== undefined) {
    query = query.lte('price', filters.maxPrice);
  }
  
  // Filtro de stock
  if (filters.inStock) {
    query = query.gt('stock', 0);
  }
  
  // Filtros de atributos (en JSONB)
  if (filters.attributeFilters) {
    Object.entries(filters.attributeFilters).forEach(([key, value]) => {
      if (typeof value === 'string' && value) {
        // Buscar en JSONB: attributes->material = "Madera"
        query = query.contains('attributes', { [key]: value });
      }
    });
  }
  
  // Ordenamiento
  switch (filters.sort) {
    case 'price_asc':
      query = query.order('price', { ascending: true });
      query = query.order('id', { ascending: true }); // Desempate
      break;
    case 'price_desc':
      query = query.order('price', { ascending: false });
      query = query.order('id', { ascending: true });
      break;
    // ... más casos
    default:
      query = query.order('created_at', { ascending: false });
  }
  
  return query;
}

/**
 * Obtiene productos por categoría con filtros y paginación
 */
export async function getProductsByCategory(
  supabase: SupabaseClient,
  categoryId: number,
  filters: ProductFilters = { attributeFilters: {} },
  pagination: Partial<Pagination> = {}
): Promise<PaginatedProductsResponse> {
  
  // Normalizar paginación
  const normalized = normalizePagination(pagination);
  const offset = (normalized.page - 1) * normalized.pageSize;
  
  // Query base con conteo total
  let query = supabase
    .from('products')
    .select('*', { count: 'exact' })
    .eq('category_id', categoryId);
  
  // Aplicar filtros
  query = applyFilters(query, filters);
  
  // Aplicar paginación
  query = query.range(offset, offset + normalized.pageSize - 1);
  
  const { data, error, count } = await query;
  
  if (error) throw new Error('Failed to fetch products');
  
  return {
    items: data || [],
    page: normalized.page,
    pageSize: normalized.pageSize,
    total: count || 0,
    totalPages: count ? Math.ceil(count / normalized.pageSize) : 0,
  };
}

/**
 * Enriquece productos con URLs de imágenes
 * (Una sola query para todos los productos)
 */
export async function enrichProductsWithImages(
  supabase: SupabaseClient,
  products: Product[]
): Promise<Array<Product & { primaryImageUrl: string | null; secondaryImageUrl: string | null }>> {
  
  if (products.length === 0) return [];
  
  // Obtener TODAS las imágenes en UNA query
  const productIds = products.map(p => p.id);
  
  const { data: assets, error } = await supabase
    .from('product_assets')
    .select('product_id, storage_bucket, storage_path, is_primary, sort_order')
    .in('product_id', productIds)
    .eq('section', 'gallery')
    .eq('kind', 'image')
    .order('is_primary', { ascending: false })
    .order('sort_order', { ascending: true });
  
  if (error) {
    // Si falla, devolver productos sin imágenes
    return products.map(p => ({ ...p, primaryImageUrl: null, secondaryImageUrl: null }));
  }
  
  // Agrupar assets por producto
  const assetsByProduct = new Map<number, typeof assets>();
  assets.forEach(asset => {
    if (!assetsByProduct.has(asset.product_id)) {
      assetsByProduct.set(asset.product_id, []);
    }
    assetsByProduct.get(asset.product_id)!.push(asset);
  });
  
  // Helper para generar URL pública
  const getPublicUrl = (bucket: string, path: string) => {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  };
  
  // Enriquecer cada producto
  return products.map(product => {
    const productAssets = assetsByProduct.get(product.id) || [];
    
    return {
      ...product,
      primaryImageUrl: productAssets[0] 
        ? getPublicUrl(productAssets[0].storage_bucket, productAssets[0].storage_path)
        : null,
      secondaryImageUrl: productAssets[1]
        ? getPublicUrl(productAssets[1].storage_bucket, productAssets[1].storage_path)
        : null,
    };
  });
}
```

---

## 🛒 Página de Producto Individual

### Estructura de la Página

```astro
---
// pages/producto/[productSlug].astro

const { productSlug } = Astro.params;

// Crear cliente Supabase
const supabase = createClient({ request: Astro.request, cookies: Astro.cookies });

// Obtener TODOS los detalles del producto
const productDetails = await getProductFullDetailsBySlug(supabase, productSlug);

if (!productDetails) {
  return Astro.redirect("/404");
}

const { product, category, subcategory, assets } = productDetails;

// Preparar assets con URLs públicas
const galleryAssets = assets.gallery.map(asset => ({
  ...asset,
  url: getPublicUrl(asset.storage_bucket, asset.storage_path),
}));

const downloadAssets = assets.download.map(asset => ({
  ...asset,
  url: getPublicUrl(asset.storage_bucket, asset.storage_path),
}));
---

<BaseLayout title={`${product.name} | ARM`}>
  <div class="product-page">
    <!-- Breadcrumb -->
    <nav class="breadcrumb">
      <a href="/">Inicio</a> / 
      <a href="/categorias">Categorías</a> /
      <a href={`/categorias/${category.slug}`}>{category.name}</a> /
      <span>{product.name}</span>
    </nav>
    
    <!-- Sección Principal: Galería + Info -->
    <section class="product-main">
      <!-- Galería de imágenes -->
      <div class="gallery">
        {galleryAssets.map((asset, index) => (
          asset.kind === "image" 
            ? <img src={asset.url} alt={product.name} />
            : <video src={asset.url} controls />
        ))}
      </div>
      
      <!-- Información del producto -->
      <div class="product-info">
        <h1>{product.name}</h1>
        <p>{subcategory.name}</p>
        
        <div class="product-meta">
          <span>Marca: {product.brand}</span>
          <span>Material: {product.attributes.material}</span>
        </div>
        
        <!-- Selector de cantidad + Agregar al carrito -->
        <div class="add-to-cart">
          <input type="number" id="quantity" value="1" min="1" />
          <AddToCartButton product={product} client:load />
        </div>
      </div>
    </section>
    
    <!-- Detalles del producto -->
    <section class="details">
      <h2>Detalles</h2>
      <p>{product.description}</p>
      
      <!-- Características desde attributes -->
      {Object.entries(product.attributes).map(([key, value]) => (
        <div>
          <span>{key}:</span>
          <span>{value}</span>
        </div>
      ))}
    </section>
    
    <!-- Archivos descargables -->
    {downloadAssets.length > 0 && (
      <section class="downloads">
        <h2>Archivos descargables</h2>
        {downloadAssets.map((file) => (
          <a href={file.url} download>
            {file.title || file.filename}
          </a>
        ))}
      </section>
    )}
  </div>
</BaseLayout>
```

---

## 🎯 Patrones y Mejores Prácticas

### 1. Sanitización de Parámetros URL

**❌ Mal:**
```typescript
const page = parseInt(url.searchParams.get("page")); // Puede ser NaN
const sort = url.searchParams.get("sort"); // Puede ser cualquier string
```

**✅ Bien:**
```typescript
// Sanitizar page
const rawPage = url.searchParams.get("page");
const parsedPage = rawPage ? parseInt(rawPage, 10) : 1;
const page = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;

// Sanitizar sort
const VALID_SORT_OPTIONS = ["price_asc", "price_desc", "name_asc", "name_desc"];
const rawSort = url.searchParams.get("sort");
const sort = rawSort && VALID_SORT_OPTIONS.includes(rawSort) ? rawSort : null;
```

### 2. Evitar Race Conditions en Fetch

Cuando el usuario cambia filtros rápidamente, pueden llegar respuestas en desorden:

```typescript
// CategoryPageShell.tsx

// AbortController para cancelar requests anteriores
const abortControllerRef = useRef<AbortController | null>(null);
const requestIdRef = useRef(0);

const fetchProducts = async () => {
  // Cancelar request anterior
  if (abortControllerRef.current) {
    abortControllerRef.current.abort();
  }
  
  // Crear nuevo controller
  const controller = new AbortController();
  abortControllerRef.current = controller;
  
  // ID único para este request
  const currentRequestId = ++requestIdRef.current;
  
  try {
    const response = await fetch(url, { signal: controller.signal });
    
    // Verificar que este request sigue siendo el actual
    if (currentRequestId !== requestIdRef.current) {
      return; // Request obsoleto, ignorar
    }
    
    const data = await response.json();
    productsStore.set({ items: data.items, /*...*/ });
    
  } catch (error) {
    // Ignorar errores de abort (son intencionales)
    if (error.name === "AbortError") return;
    
    // Manejar otros errores
    productsStore.set({ error: error.message });
  }
};
```

### 3. Hidratación Suave (SSR → CSR)

Mostrar datos del servidor mientras se inicializa el cliente:

```typescript
const [isInitialized, setIsInitialized] = useState(false);

// Usar datos iniciales hasta que el store esté listo
const displayProducts = isInitialized ? products.items : initialProducts;

useEffect(() => {
  initProductsStore({ items: initialProducts, /*...*/ });
  setIsInitialized(true);
}, []);
```

### 4. Reset de Página al Cambiar Filtros

Cuando cambia un filtro, siempre volver a página 1:

```typescript
// filtersStore.ts

export function setSort(sort: SortOption | null) {
  filtersStore.set({
    ...filtersStore.get(),
    sort,
    page: 1, // ← Reset a página 1
  });
}

export function setSubcategory(subcategorySlug: string | null) {
  filtersStore.set({
    ...filtersStore.get(),
    subcategorySlug,
    page: 1, // ← Reset a página 1
    attributeFilters: {}, // ← Limpiar filtros también
  });
}
```

### 5. Ordenamiento Consistente en Queries

Para evitar que productos "salten" entre páginas al paginar:

```typescript
// products.ts

switch (filters.sort) {
  case 'price_asc':
    query = query.order('price', { ascending: true });
    query = query.order('id', { ascending: true }); // ← Desempate por ID
    break;
  // ...
  default:
    query = query.order('created_at', { ascending: false });
    query = query.order('id', { ascending: false }); // ← Desempate por ID
}
```

---

## 💡 Ejemplos Prácticos

### Ejemplo 1: Agregar un Nuevo Filtro

Quieres agregar un filtro por "Color" a una subcategoría.

**Paso 1: Configurar en la base de datos**

En la tabla `subcategories`, el campo `filter_config`:

```json
[
  {
    "key": "color",
    "label": "Color",
    "type": "checkbox",
    "options": ["Blanco", "Natural", "Negro", "Roble"]
  }
]
```

**Paso 2: ¡Listo!**

El sistema lo detecta automáticamente:
- `FiltersPanel` renderiza los checkboxes
- Al seleccionar, `setAttributeFilter("color", "Blanco")` actualiza el store
- La URL cambia a `?color=Blanco`
- La API filtra por `attributes->color`

### Ejemplo 2: Agregar Nueva Opción de Ordenamiento

Quieres agregar "Ordenar por popularidad".

**Paso 1: Actualizar tipos**
```typescript
// lib/data/types.ts
type SortOption =
  | "price_asc"
  | "price_desc"
  | "name_asc"
  | "name_desc"
  | "popularity";  // ← Nuevo
```

**Paso 2: Actualizar listas de validación**
```typescript
// [categorySlug].astro, api/products.ts, CategoryPageShell.tsx
const VALID_SORT_OPTIONS = [
  'price_asc', 'price_desc', 'name_asc', 'name_desc',
  'popularity'  // ← Agregar aquí
];
```

**Paso 3: Agregar lógica en applyFilters**
```typescript
// lib/data/products.ts
switch (filters.sort) {
  // ... casos existentes
  case 'popularity':
    query = query.order('views', { ascending: false }); // Asume campo "views"
    query = query.order('id', { ascending: true });
    break;
}
```

**Paso 4: Agregar opción en UI**
```typescript
// SortBar.tsx
<select>
  <option value="popularity">Más populares</option>
  {/* ... otras opciones */}
</select>
```

### Ejemplo 3: Agregar Nuevo Tipo de Filtro "Range"

Filtro de rango de precio visual.

**Paso 1: Configurar en BD**
```json
{
  "key": "price",
  "label": "Precio",
  "type": "range",
  "min": 0,
  "max": 5000,
  "step": 50
}
```

**Paso 2: FiltersPanel ya lo soporta**
```typescript
// FiltersPanel.tsx - Ya existe este código
{config.type === "range" && (
  <input
    type="range"
    min={config.min}
    max={config.max}
    step={config.step}
    onChange={(e) => handleFilterChange(config.key, e.target.value)}
  />
)}
```

---

## 🔧 Troubleshooting

### Problema: Los productos no se actualizan al cambiar filtros

**Posibles causas:**

1. **El efecto no se dispara**
   ```typescript
   // Verificar que las dependencias del useEffect están correctas
   useEffect(() => {
     // ...fetch
   }, [
     filters.subcategorySlug,
     filters.page,
     JSON.stringify(filters.attributeFilters), // ← Importante serializar objetos
   ]);
   ```

2. **Race condition** - El request antiguo sobrescribe al nuevo
   - Solución: Usar AbortController (ver patrón arriba)

3. **Cache del navegador**
   - Agregar timestamp a la URL: `?t=${Date.now()}`
   - O usar headers `Cache-Control: no-cache`

### Problema: La URL no se actualiza

**Verificar:**
```typescript
// ¿Se está bloqueando por isSyncingUrl?
if (isSyncingUrl.current) return;

// ¿La URL es diferente?
const newURL = buildURL();
const currentURL = window.location.pathname + window.location.search;
if (newURL !== currentURL) {
  window.history.pushState({}, "", newURL);
}
```

### Problema: El botón "atrás" no funciona correctamente

**Verificar listener de popstate:**
```typescript
useEffect(() => {
  const handlePopState = () => {
    isSyncingUrl.current = true; // ← Evitar loop
    
    // Leer URL y actualizar store
    const params = new URLSearchParams(window.location.search);
    initFiltersStore({...params...});
    
    setTimeout(() => {
      isSyncingUrl.current = false;
    }, 100);
  };
  
  window.addEventListener('popstate', handlePopState);
  return () => window.removeEventListener('popstate', handlePopState);
}, []);
```

### Problema: Productos duplicados al paginar

**Causa:** Ordenamiento no determinístico.

**Solución:** Siempre agregar un criterio de desempate único:
```typescript
query = query.order('price', { ascending: true });
query = query.order('id', { ascending: true }); // ← ID es único
```

### Problema: Filtros de atributos no funcionan

**Verificar:**
1. El `key` del filtro coincide con la propiedad en `attributes` JSONB
2. Los valores son exactamente iguales (case-sensitive)
3. La query Supabase está correcta:
   ```typescript
   // Para string simple
   query = query.contains('attributes', { color: "Blanco" });
   
   // Para array de valores (OR)
   // Requiere lógica más compleja con .or()
   ```

---

## 📚 Recursos Adicionales

- [Documentación de Astro](https://docs.astro.build)
- [Documentación de Nanostores](https://github.com/nanostores/nanostores)
- [Documentación de Supabase](https://supabase.com/docs)
- [Preact Hooks](https://preactjs.com/guide/v10/hooks)

---

## 🏁 Resumen

```
┌─────────────────────────────────────────────────────────────────┐
│                  FLUJO COMPLETO DEL CATÁLOGO                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. Usuario entra a /categorias/dormitorio                      │
│     ↓                                                            │
│  2. Astro (SSR) ejecuta [categorySlug].astro                    │
│     → Consulta Supabase                                          │
│     → Renderiza HTML con productos                               │
│     ↓                                                            │
│  3. Navegador carga HTML + JS                                   │
│     ↓                                                            │
│  4. CategoryPageShell se hidrata (client:load)                  │
│     → Inicializa stores con datos del servidor                  │
│     ↓                                                            │
│  5. Usuario interactúa (cambia filtro, página, etc.)            │
│     ↓                                                            │
│  6. Store se actualiza (filtersStore.set)                       │
│     ↓                                                            │
│  7. useEffect detecta cambio                                    │
│     → Actualiza URL (history.pushState)                         │
│     → Fetch a /api/products                                     │
│     ↓                                                            │
│  8. API procesa request                                         │
│     → Sanitiza parámetros                                        │
│     → Consulta Supabase con filtros                             │
│     → Retorna JSON                                               │
│     ↓                                                            │
│  9. Response actualiza productsStore                            │
│     ↓                                                            │
│  10. Componentes re-renderizan con nuevos datos                 │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

**¿Preguntas?** Revisa primero esta documentación. Si el problema persiste, verifica los logs de consola y el Network tab del navegador.
