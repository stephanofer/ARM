import { useState, useEffect } from "preact/hooks";
import { useStore } from "@nanostores/preact";
import {
  $isLoading,
  $products,
  $totalProducts,
  $requestCache,
} from "@/shopStore";
import type {
  SubcategoryWithFilters,
  FilterConfig,
  Product,
} from "@/types";
import styles from "./ProductsFilter.module.css";

interface ProductsFilterProps {
  subCategories: SubcategoryWithFilters[];
  categoryId: number;
  initialFilters: Record<string, any>;
  // Props para la caché inicial
  initialProducts: Product[];
  initialTotal: number;
}

export function ProductsFilter({
  subCategories,
  categoryId,
  initialFilters,
  initialProducts,
  initialTotal,
}: ProductsFilterProps) {
  
  // 1. Helper para obtener estado inicial
  const getInitialSub = () => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("subcategory");
  };

  // 2. Estados
  const [activeSubSlug, setActiveSubSlug] = useState<string | null>(
    getInitialSub()
  );
  const [selectedFilters, setSelectedFilters] =
    useState<Record<string, any>>(initialFilters);
  const [dynamicFilters, setDynamicFilters] = useState<FilterConfig[]>([]);

  // 3. Efecto para actualizar configuración de filtros dinámicos
  useEffect(() => {
    const activeSub = subCategories.find((s) => s.slug === activeSubSlug);
    setDynamicFilters(activeSub?.filter_config || []);
  }, [activeSubSlug, subCategories]);

  // 4. EFECTO: CACHÉ INICIAL (Prime)
  // Guardamos lo que vino del servidor para que el botón "Atrás" sea instantáneo
  useEffect(() => {
    const url = new URL(window.location.href);
    const params = new URLSearchParams();

    params.set("categoryId", categoryId.toString());
    params.set("page", url.searchParams.get("page") || "1");

    const subSlug = url.searchParams.get("subcategory");
    const activeSub = subCategories.find((s) => s.slug === subSlug);
    if (activeSub) params.set("subcategoryId", activeSub.id.toString());

    url.searchParams.forEach((val, key) => {
      if (!["subcategory", "page", "categoryId"].includes(key)) {
        params.set(key, val);
      }
    });

    const cacheKey = params.toString();
    const currentCache = $requestCache.get();

    if (!currentCache[cacheKey]) {
      $requestCache.setKey(cacheKey, {
        products: initialProducts,
        total: initialTotal,
      });
      // console.log("🧠 Caché inicial guardada:", cacheKey);
    }
  }, []);

  // 5. LÓGICA CENTRAL: URL -> Caché -> API -> Store
  const syncStateWithUrl = async (url: URL, shouldFetch: boolean = true) => {
    const subSlug = url.searchParams.get("subcategory");
    const page = Number(url.searchParams.get("page")) || 1;

    const currentFilters: Record<string, any> = {};
    // Importante: Excluir 'page' para que no rompa la query de Supabase
    url.searchParams.forEach((val, key) => {
      if (!["subcategory", "page", "categoryId"].includes(key)) {
        currentFilters[key] = val;
      }
    });

    // Actualizar UI
    setActiveSubSlug(subSlug);
    setSelectedFilters(currentFilters);
    
    // Nota: dynamicFilters se actualiza via el useEffect de arriba

    if (shouldFetch) {
      // Preparar parámetros para la API / Caché
      const activeSub = subCategories.find((s) => s.slug === subSlug);
      const apiParams = new URLSearchParams();
      apiParams.set("categoryId", categoryId.toString());
      apiParams.set("page", page.toString());
      if (activeSub) apiParams.set("subcategoryId", activeSub.id.toString());

      Object.entries(currentFilters).forEach(([k, v]) =>
        apiParams.set(k, v as string)
      );

      const cacheKey = apiParams.toString();

      // A) REVISAR CACHÉ
      const cachedData = $requestCache.get()[cacheKey];
      if (cachedData) {
        // console.log("⚡ Usando caché:", cacheKey);
        $products.set(cachedData.products);
        $totalProducts.set(cachedData.total);
        return; // Salimos, no hacemos fetch
      }

      // B) FETCH API (Si no hay caché)
      $isLoading.set(true);
      try {
        const res = await fetch(`/api/shop?${apiParams.toString()}`);
        const result = await res.json();

        // Actualizar Stores
        $products.set(result.products);
        $totalProducts.set(result.total);

        // Guardar en Caché
        $requestCache.setKey(cacheKey, {
          products: result.products,
          total: result.total,
        });
      } catch (e) {
        console.error("Error fetching products:", e);
      } finally {
        $isLoading.set(false);
      }
    }
  };

  // 6. Escuchar navegación del navegador
  useEffect(() => {
    const handlePopState = () => {
      syncStateWithUrl(new URL(window.location.href), true);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // 7. Helpers de actualización de URL
  const updateUrlAndSync = (url: URL) => {
    window.history.pushState({}, "", url);
    syncStateWithUrl(url, true);
  };

  const handleSubcategoryClick = (slug: string) => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("subcategory") === slug) return;

    url.search = ""; // Limpiar filtros anteriores
    url.searchParams.set("subcategory", slug);
    url.searchParams.set("page", "1"); // Reset página

    updateUrlAndSync(url);
  };

  const handleFilterChange = (
    key: string,
    value: string,
    checked: boolean
  ) => {
    const url = new URL(window.location.href);
    if (checked) {
      url.searchParams.set(key, value);
    } else {
      url.searchParams.delete(key);
    }
    url.searchParams.set("page", "1"); // Reset página

    updateUrlAndSync(url);
  };

  const handleClearFilters = () => {
    const url = new URL(window.location.href);
    url.search = "";
    updateUrlAndSync(url);
  };

  // 8. Renderizado
  return (
    <aside className={styles["products-filter"]}>
      <div className={styles["filters-header"]}>
        <h2 className={styles["filters-title"]}>Filtros</h2>
        <button
          className={styles["clear-filters"]}
          id="clearFilters"
          onClick={handleClearFilters}
        >
          Limpiar todo
        </button>
      </div>

      {/* Disponibilidad */}
      <div className={styles["filter-section"]}>
        <h3 className={styles["filter-section-title"]}>
          <span>Disponibilidad</span>
          <svg
            className={styles["chevron"]}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </h3>
        <div className={styles["filter-options"]}>
          <label className={styles["filter-option"]}>
            <input
              type="checkbox"
              name="stock"
              value="available"
              checked={selectedFilters["stock"] === "available"}
              onChange={(e) =>
                handleFilterChange(
                  "stock",
                  "available",
                  e.currentTarget.checked
                )
              }
            />
            <span className={styles["checkbox-custom"]}></span>
            <span className={styles["option-label"]}>Disponible</span>
          </label>
          <label className={styles["filter-option"]}>
            <input
              type="checkbox"
              name="stock"
              value="unavailable"
              checked={selectedFilters["stock"] === "unavailable"}
              onChange={(e) =>
                handleFilterChange(
                  "stock",
                  "unavailable",
                  e.currentTarget.checked
                )
              }
            />
            <span className={styles["checkbox-custom"]}></span>
            <span className={styles["option-label"]}>No disponible</span>
          </label>
        </div>
      </div>

      {/* Lista de Subcategorías */}
      {subCategories.length > 0 && (
        <div className={styles["filter-section"]}>
          <h3 className={styles["filter-section-title"]}>
            <span>Subcategorías</span>
            <svg
              className={styles["chevron"]}
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </h3>
          <div
            className={`${styles["filter-options"]} ${styles["subcategories-list"]}`}
          >
            {subCategories.map((subcategory) => (
              <a
                key={subcategory.slug}
                className={`${styles["subcategory-link"]} ${
                  activeSubSlug === subcategory.slug ? styles["active"] : ""
                }`}
                onClick={() => handleSubcategoryClick(subcategory.slug)}
                style={{ cursor: "pointer" }}
              >
                {subcategory.name}
                <svg
                  className={styles["arrow-icon"]}
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polyline points="9 18 15 12 9 6"></polyline>
                </svg>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Filtros Dinámicos (JSONB) */}
      {dynamicFilters.map((filter) => (
        <div key={filter.key} className={styles["filter-section"]}>
          <h3 className={styles["filter-section-title"]}>{filter.label}</h3>
          <div className={styles["filter-options"]}>
            {filter.options?.map((option) => (
              <label key={option} className={styles["filter-option"]}>
                <input
                  type="checkbox"
                  checked={selectedFilters[filter.key] === option}
                  onChange={(e) =>
                    handleFilterChange(
                      filter.key,
                      option,
                      e.currentTarget.checked
                    )
                  }
                />
                <span className={styles["checkbox-custom"]}></span>
                <span className={styles["option-label"]}>{option}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </aside>
  );
}