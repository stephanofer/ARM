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

        const response = await fetch(`/api/products?${apiParams.toString()}`);

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

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

      // Parsear parámetros de la URL
      const subcategorySlug = params.get("subcategoria") || null;
      const page = parseInt(params.get("page") || "1");
      const sort = params.get("sort") || null;
      const minPrice = params.get("minPrice");
      const maxPrice = params.get("maxPrice");
      const inStock = params.get("inStock") === "true";

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

      // Actualizar filtersStore
      initFiltersStore({
        categorySlug: category.slug,
        subcategorySlug,
        page,
        pageSize: filters.pageSize,
        sort: sort as any,
        attributeFilters,
        minPrice: minPrice ? parseFloat(minPrice) : undefined,
        maxPrice: maxPrice ? parseFloat(maxPrice) : undefined,
        inStock,
      });

      setTimeout(() => {
        isSyncingUrl.current = false;
      }, 100);
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [category.slug, filters.pageSize]);

  return (
    <div className={styles.container}>
      {/* Tabs de subcategorías */}
      {/* <SubcategoryTabs
        subcategories={subcategories}
        currentSubcategorySlug={filters.subcategorySlug}
      /> */}

      <div className={styles.mainContent}>
        {/* Panel de filtros */}
        <aside className={styles.sidebar}>
          <FiltersPanel
            subcategories={subcategories}
            currentSubcategorySlug={filters.subcategorySlug}
            filterConfig={currentFilterConfig}
            currentFilters={filters.attributeFilters}
          />
        </aside>

        {/* Contenido principal */}
        <main className={styles.content}>
          <h1 className={styles.title}>{category.name}</h1>
          {/* Barra de orden y resultados */}
          <SortBar
            currentSort={filters.sort}
            totalResults={displayTotal || 0}
            isLoading={products.isLoading}
          />

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
