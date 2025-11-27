import type {
  Category,
  FilterConfig,
  Product,
  Subcategory,
} from "@/lib/data/types";
import {
  cacheFilterConfig,
  cacheSubcategories,
  getCachedFilterConfig,
} from "@/stores/catalogStore";
import { filtersStore, initFiltersStore } from "@/stores/filtersStore";
import { initProductsStore, productsStore } from "@/stores/productsStore";
import { useStore } from "@nanostores/preact";
import { useEffect, useRef, useState } from "preact/hooks";
import styles from "./CategoryPageShell.module.css";
import { EmptyState } from "./EmptyState";
import { ErrorState } from "./ErrorState";
import { FiltersPanel } from "./FiltersPanel";
import { Pagination } from "./Pagination";
import { ProductsGrid } from "./ProductsGrid";
import { SortBar } from "./SortBar";
import { SubcategoryTabs } from "./SubcategoryTabs";

export interface CategoryPageShellProps {
  category: Category;
  subcategories: Subcategory[];
  currentSubcategory: Subcategory | null;
  filterConfig: FilterConfig[];
  initialProducts: Array<Product & { 
    primaryImageUrl?: string | null; 
    secondaryImageUrl?: string | null 
  }>;
  initialFilters: {
    subcategorySlug: string | null;
    page: number;
    pageSize: number;
    sort: string | null;
    attributeFilters: Record<string, string | string[]>;
    minPrice?: number;
    maxPrice?: number;
    inStock: boolean;
  };
  initialPagination: {
    page: number;
    pageSize: number;
    total: number | null;
    totalPages: number | null;
  };
}

/**
 * Shell principal de la página de categoría/subcategoría
 * Maneja sincronización URL ↔ Store ↔ API ↔ UI
 */
// Valores permitidos para sort
const VALID_SORT_OPTIONS = ['price_asc', 'price_desc', 'name_asc', 'name_desc', 'oldest'] as const;

/**
 * Sanitiza y valida parámetros de URL para evitar valores inválidos
 */
function sanitizeUrlParams(params: URLSearchParams, subcategorySlugs: string[]) {
  // Page: si NaN o < 1 → 1
  const rawPage = params.get('page');
  const parsedPage = rawPage ? parseInt(rawPage, 10) : 1;
  const page = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;

  // Sort: si no está en valores permitidos → null
  const rawSort = params.get('sort');
  const sort = rawSort && VALID_SORT_OPTIONS.includes(rawSort as any) ? rawSort : null;

  // Subcategory: si no existe en la lista → null
  const rawSubcategory = params.get('subcategoria');
  const subcategorySlug = rawSubcategory && subcategorySlugs.includes(rawSubcategory) 
    ? rawSubcategory 
    : null;

  // MinPrice/MaxPrice: si NaN → undefined
  const rawMinPrice = params.get('minPrice');
  const rawMaxPrice = params.get('maxPrice');
  const minPrice = rawMinPrice ? parseFloat(rawMinPrice) : undefined;
  const maxPrice = rawMaxPrice ? parseFloat(rawMaxPrice) : undefined;
  const sanitizedMinPrice = minPrice !== undefined && !Number.isNaN(minPrice) && minPrice >= 0 ? minPrice : undefined;
  const sanitizedMaxPrice = maxPrice !== undefined && !Number.isNaN(maxPrice) && maxPrice >= 0 ? maxPrice : undefined;

  // InStock: solo true si es exactamente "true"
  const inStock = params.get('inStock') === 'true';

  return {
    page,
    sort,
    subcategorySlug,
    minPrice: sanitizedMinPrice,
    maxPrice: sanitizedMaxPrice,
    inStock,
  };
}

export function CategoryPageShell({
  category,
  subcategories,
  currentSubcategory,
  filterConfig,
  initialProducts,
  initialFilters,
  initialPagination,
}: CategoryPageShellProps) {
  const filters = useStore(filtersStore);
  const products = useStore(productsStore);
  const isSyncingUrl = useRef(false);
  const hasInitialProductsRendered = useRef(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // AbortController para cancelar requests anteriores y evitar race conditions
  const abortControllerRef = useRef<AbortController | null>(null);
  // ID único para cada request, para verificar que el response corresponde al request actual
  const requestIdRef = useRef(0);
  
  // Lista de slugs de subcategorías para validación
  const subcategorySlugs = subcategories.map(s => s.slug);
  
  // Estado para el drawer de filtros en mobile
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  // Estado local para filter config dinámico
  const [currentFilterConfig, setCurrentFilterConfig] =
    useState<FilterConfig[]>(filterConfig);

  // Usar productos iniciales hasta que el store se inicialice
  const displayProducts = isInitialized ? products.items : initialProducts;
  const displayTotal = isInitialized ? products.total : initialPagination.total;
  const displayPage = isInitialized ? products.page : initialPagination.page;
  const displayTotalPages = isInitialized
    ? products.totalPages
    : initialPagination.totalPages;

  // Inicializar stores al montar
  useEffect(() => {
    if (!isInitialized) {
      // Inicializar filtersStore con valores iniciales
      initFiltersStore({
        categorySlug: category.slug,
        subcategorySlug: initialFilters.subcategorySlug,
        page: initialFilters.page,
        pageSize: initialFilters.pageSize,
        sort: initialFilters.sort as any,
        attributeFilters: initialFilters.attributeFilters,
        minPrice: initialFilters.minPrice,
        maxPrice: initialFilters.maxPrice,
        inStock: initialFilters.inStock,
      });

      // Inicializar productsStore con productos iniciales
      initProductsStore({
        items: initialProducts,
        page: initialPagination.page,
        pageSize: initialPagination.pageSize,
        total: initialPagination.total,
        totalPages: initialPagination.totalPages,
      });

      // Cachear subcategorías
      cacheSubcategories(category.slug, subcategories);

      // Cachear filter config inicial si hay subcategoría
      if (currentSubcategory) {
        cacheFilterConfig(currentSubcategory.slug, filterConfig);
      }

      // Marcar que los productos iniciales ya están renderizados
      hasInitialProductsRendered.current = true;

      setIsInitialized(true);
    }
  }, []); // Vacío para que solo se ejecute una vez

  // Efecto: Cargar filter config cuando cambia la subcategoría
  useEffect(() => {
    if (!filters.subcategorySlug) {
      setCurrentFilterConfig([]);
      return;
    }

    // Intentar obtener del cache
    const cached = getCachedFilterConfig(filters.subcategorySlug);
    if (cached) {
      setCurrentFilterConfig(cached);
      return;
    }

    // Si no está en cache, cargar desde subcategories (ya están en memoria)
    const subcategory = subcategories.find(
      (s) => s.slug === filters.subcategorySlug
    );
    if (subcategory) {
      const config = subcategory.filter_config || [];
      setCurrentFilterConfig(config);
      cacheFilterConfig(filters.subcategorySlug, config);
    } else {
      setCurrentFilterConfig([]);
    }
  }, [filters.subcategorySlug]);

  // Efecto: Sincronizar filtersStore → URL + API
  useEffect(() => {
    if (!isInitialized) return;
    if (isSyncingUrl.current) return;

    const buildURL = () => {
      const params = new URLSearchParams();

      if (filters.subcategorySlug) {
        params.set("subcategoria", filters.subcategorySlug);
      }

      if (filters.page > 1) {
        params.set("page", filters.page.toString());
      }

      if (filters.sort) {
        params.set("sort", filters.sort);
      }

      Object.entries(filters.attributeFilters).forEach(([key, value]) => {
        if (Array.isArray(value)) {
          value.forEach((v) => params.append(key, v));
        } else {
          params.set(key, value);
        }
      });

      if (filters.minPrice !== undefined) {
        params.set("minPrice", filters.minPrice.toString());
      }
      if (filters.maxPrice !== undefined) {
        params.set("maxPrice", filters.maxPrice.toString());
      }

      if (filters.inStock) {
        params.set("inStock", "true");
      }

      const queryString = params.toString();
      return `/categorias/${category.slug}${
        queryString ? "?" + queryString : ""
      }`;
    };

    const fetchProducts = async () => {
      // Cancelar request anterior si existe (evita race conditions)
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      // Crear nuevo AbortController para este request
      const controller = new AbortController();
      abortControllerRef.current = controller;
      
      // Incrementar ID de request para verificar que el response es el correcto
      const currentRequestId = ++requestIdRef.current;
      
      try {
        const apiParams = new URLSearchParams();
        apiParams.set("categorySlug", category.slug);

        if (filters.subcategorySlug) {
          apiParams.set("subcategoria", filters.subcategorySlug);
        }
        apiParams.set("page", filters.page.toString());
        apiParams.set("pageSize", filters.pageSize.toString());

        if (filters.sort) {
          apiParams.set("sort", filters.sort);
        }

        Object.entries(filters.attributeFilters).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            value.forEach((v) => apiParams.append(key, v));
          } else {
            apiParams.set(key, value);
          }
        });

        if (filters.minPrice !== undefined) {
          apiParams.set("minPrice", filters.minPrice.toString());
        }
        if (filters.maxPrice !== undefined) {
          apiParams.set("maxPrice", filters.maxPrice.toString());
        }
        if (filters.inStock) {
          apiParams.set("inStock", "true");
        }

        productsStore.set({
          ...productsStore.get(),
          isLoading: true,
          error: null,
        });

        const response = await fetch(`/api/products?${apiParams.toString()}`, {
          signal: controller.signal,
        });

        // Verificar que este request sigue siendo el actual
        if (currentRequestId !== requestIdRef.current) {
          return; // Request obsoleto, ignorar response
        }

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Doble verificación después de parsear JSON
        if (currentRequestId !== requestIdRef.current) {
          return;
        }

        productsStore.set({
          items: data.items,
          page: data.page,
          pageSize: data.pageSize,
          total: data.total,
          totalPages: data.totalPages,
          isLoading: false,
          error: null,
        });
      } catch (error) {
        // Ignorar errores de abort (son intencionales)
        if (error instanceof Error && error.name === 'AbortError') {
          return;
        }
        
        // Verificar que este request sigue siendo el actual
        if (currentRequestId !== requestIdRef.current) {
          return;
        }
        
        productsStore.set({
          ...productsStore.get(),
          isLoading: false,
          error: error instanceof Error ? error.message : "Error desconocido",
        });
      }
    };

    const newURL = buildURL();
    const currentURL = window.location.pathname + window.location.search;

    if (newURL !== currentURL) {
      window.history.pushState({}, "", newURL);
      fetchProducts();
    } else if (hasInitialProductsRendered.current) {
      hasInitialProductsRendered.current = false;
    }
  }, [
    filters.subcategorySlug,
    filters.page,
    filters.sort,
    JSON.stringify(filters.attributeFilters), // Serializar para evitar renders por referencia
    filters.minPrice,
    filters.maxPrice,
    filters.inStock,
  ]);

  // Listener de popstate (navegación atrás/adelante)
  useEffect(() => {
    const handlePopState = () => {
      isSyncingUrl.current = true;

      const params = new URLSearchParams(window.location.search);

      // Usar función de sanitización para validar todos los parámetros
      const sanitized = sanitizeUrlParams(params, subcategorySlugs);

      const attributeFilters: Record<string, string | string[]> = {};
      const reservedParams = [
        "subcategoria",
        "page",
        "sort",
        "minPrice",
        "maxPrice",
        "inStock",
      ];

      params.forEach((value, key) => {
        if (!reservedParams.includes(key)) {
          const existing = attributeFilters[key];
          if (existing) {
            if (Array.isArray(existing)) {
              existing.push(value);
            } else {
              attributeFilters[key] = [existing, value];
            }
          } else {
            attributeFilters[key] = value;
          }
        }
      });

      // Actualizar filtersStore con valores sanitizados
      initFiltersStore({
        categorySlug: category.slug,
        subcategorySlug: sanitized.subcategorySlug,
        page: sanitized.page,
        pageSize: filters.pageSize,
        sort: sanitized.sort as any,
        attributeFilters,
        minPrice: sanitized.minPrice,
        maxPrice: sanitized.maxPrice,
        inStock: sanitized.inStock,
      });

      setTimeout(() => {
        isSyncingUrl.current = false;
      }, 100);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [category.slug, filters.pageSize, subcategorySlugs]);
  
  // Cleanup: cancelar requests pendientes al desmontar
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return (
    <div className={styles.container}>
      {/* Tabs de subcategorías */}
      <div className={styles.mainContent}>
        {/* Panel de filtros */}
        <aside className={styles.sidebar}>
          <FiltersPanel
            subcategories={subcategories}
            currentSubcategorySlug={filters.subcategorySlug}
            filterConfig={currentFilterConfig}
            currentFilters={filters.attributeFilters}
            isOpen={isFilterDrawerOpen}
            onClose={() => setIsFilterDrawerOpen(false)}
          />
        </aside>

        {/* Contenido principal */}
        <main className={styles.content}>
          <h1 className={styles.title}>{category.name}</h1>
          <p className={styles.mobileResultsCount}>
            {displayTotal || 0} productos
          </p>
          
          {/* Barra móvil con filtro y orden */}
          <div className={styles.mobileToolbar}>
            <button 
              className={styles.mobileFilterBtn}
              onClick={() => setIsFilterDrawerOpen(true)}
              aria-label="Abrir filtros"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
              </svg>
              <span>Filtro</span>
            </button>
            
            {/* SortBar en mobile es solo el select */}
            <div className={styles.mobileSortWrapper}>
              <SortBar
                currentSort={filters.sort}
                totalResults={displayTotal || 0}
                isLoading={products.isLoading}
              />
            </div>
          </div>
          
          {/* Barra de orden y resultados (desktop) */}
          <div className={styles.desktopSortBar}>
            <SortBar
              currentSort={filters.sort}
              totalResults={displayTotal || 0}
              isLoading={products.isLoading}
            />
          </div>

          {/* Estados de error/loading/vacío */}
          {products.error && <ErrorState error={products.error} />}

          {!products.error &&
            !products.isLoading &&
            displayProducts.length === 0 && <EmptyState />}

          {/* Grid de productos */}
          {!products.error && displayProducts.length > 0 && (
            <>
              <ProductsGrid
                products={displayProducts}
                isLoading={products.isLoading}
              />

              {/* Paginación */}
              <Pagination
                currentPage={displayPage}
                totalPages={displayTotalPages || 1}
                isLoading={products.isLoading}
              />
            </>
          )}
        </main>
      </div>
    </div>
  );
}
