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
  initialProducts: Array<
    Product & {
      primaryImageUrl?: string | null;
      secondaryImageUrl?: string | null;
    }
  >;
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

const VALID_SORT_OPTIONS = [
  "price_asc",
  "price_desc",
  "name_asc",
  "name_desc",
  "oldest",
] as const;

function sanitizeUrlParams(
  params: URLSearchParams,
  subcategorySlugs: string[]
) {
  const rawPage = params.get("page");
  const parsedPage = rawPage ? parseInt(rawPage, 10) : 1;
  const page = Number.isNaN(parsedPage) || parsedPage < 1 ? 1 : parsedPage;

  const rawSort = params.get("sort");
  const sort =
    rawSort && VALID_SORT_OPTIONS.includes(rawSort as any) ? rawSort : null;

  const rawSubcategory = params.get("subcategoria");
  const subcategorySlug =
    rawSubcategory && subcategorySlugs.includes(rawSubcategory)
      ? rawSubcategory
      : null;

  const rawMinPrice = params.get("minPrice");
  const rawMaxPrice = params.get("maxPrice");
  const minPrice = rawMinPrice ? parseFloat(rawMinPrice) : undefined;
  const maxPrice = rawMaxPrice ? parseFloat(rawMaxPrice) : undefined;
  const sanitizedMinPrice =
    minPrice !== undefined && !Number.isNaN(minPrice) && minPrice >= 0
      ? minPrice
      : undefined;
  const sanitizedMaxPrice =
    maxPrice !== undefined && !Number.isNaN(maxPrice) && maxPrice >= 0
      ? maxPrice
      : undefined;

  const inStock = params.get("inStock") === "true";

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

  const abortControllerRef = useRef<AbortController | null>(null);
  const requestIdRef = useRef(0);

  const subcategorySlugs = subcategories.map((s) => s.slug);

  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);

  const [currentFilterConfig, setCurrentFilterConfig] =
    useState<FilterConfig[]>(filterConfig);

  const displayProducts = isInitialized ? products.items : initialProducts;
  const displayTotal = isInitialized ? products.total : initialPagination.total;
  const displayPage = isInitialized ? products.page : initialPagination.page;
  const displayTotalPages = isInitialized
    ? products.totalPages
    : initialPagination.totalPages;

  useEffect(() => {
    if (!isInitialized) {
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

      initProductsStore({
        items: initialProducts,
        page: initialPagination.page,
        pageSize: initialPagination.pageSize,
        total: initialPagination.total,
        totalPages: initialPagination.totalPages,
      });

      cacheSubcategories(category.slug, subcategories);

      if (currentSubcategory) {
        cacheFilterConfig(currentSubcategory.slug, filterConfig);
      }

      hasInitialProductsRendered.current = true;

      setIsInitialized(true);
    }
  }, []);

  useEffect(() => {
    if (!filters.subcategorySlug) {
      setCurrentFilterConfig([]);
      return;
    }

    const cached = getCachedFilterConfig(filters.subcategorySlug);
    if (cached) {
      setCurrentFilterConfig(cached);
      return;
    }

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
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

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

        if (currentRequestId !== requestIdRef.current) {
          return;
        }

        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

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
        if (error instanceof Error && error.name === "AbortError") {
          return;
        }

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
    JSON.stringify(filters.attributeFilters),
    filters.minPrice,
    filters.maxPrice,
    filters.inStock,
  ]);

  useEffect(() => {
    const handlePopState = () => {
      isSyncingUrl.current = true;

      const params = new URLSearchParams(window.location.search);

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

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.mainContent}>
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

        <main className={styles.content}>
          <h1 className={styles.title}>{category.name}</h1>
          <p className={styles.mobileResultsCount}>
            {(displayTotal ?? 0) > 1
              ? `${displayTotal} Productos Encontrados`
              : displayTotal === 1
              ? "1 Producto Encontrado"
              : "Sin resultados"}
          </p>

          <div className={styles.mobileToolbar}>
            <button
              className={styles.mobileFilterBtn}
              onClick={() => setIsFilterDrawerOpen(true)}
              aria-label="Abrir filtros"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
              </svg>
              <span>Filtro</span>
            </button>

            <div className={styles.mobileSortWrapper}>
              <SortBar
                currentSort={filters.sort}
                totalResults={displayTotal || 0}
                isLoading={products.isLoading}
              />
            </div>
          </div>

          <div className={styles.desktopSortBar}>
            <SortBar
              currentSort={filters.sort}
              totalResults={displayTotal || 0}
              isLoading={products.isLoading}
            />
          </div>

          {products.error && <ErrorState error={products.error} />}

          {!products.error &&
            !products.isLoading &&
            displayProducts.length === 0 && <EmptyState />}

          {!products.error && displayProducts.length > 0 && (
            <>
              <ProductsGrid
                products={displayProducts}
                isLoading={products.isLoading}
              />

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
