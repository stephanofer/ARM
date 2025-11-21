import { useState, useEffect } from "preact/hooks";
import { useStore } from "@nanostores/preact";
import { $isLoading, $products, $totalProducts } from "@/shopStore";
import type { SubcategoryWithFilters, FilterConfig } from "@/types";
import styles from "./ProductsFilter.module.css";

interface ProductsFilterProps {
  subCategories: SubcategoryWithFilters[];
  categoryId: number;
  initialFilters: Record<string, any>;
}

export function ProductsFilter({
  subCategories,
  categoryId,
  initialFilters,
}: ProductsFilterProps) {
  const getInitialSub = () => {
    if (typeof window === "undefined") return null;
    return new URLSearchParams(window.location.search).get("subcategory");
  };

  const [activeSubSlug, setActiveSubSlug] = useState<string | null>(
    getInitialSub()
  );
  const [selectedFilters, setSelectedFilters] =
    useState<Record<string, any>>(initialFilters);
  const [dynamicFilters, setDynamicFilters] = useState<FilterConfig[]>([]);

  useEffect(() => {
    const activeSub = subCategories.find((s) => s.slug === activeSubSlug);

    setDynamicFilters(activeSub?.filter_config || []);
  }, [activeSubSlug, subCategories]);

  const syncStateWithUrl = async (url: URL, shouldFetch: boolean = true) => {
    const subSlug = url.searchParams.get("subcategory");
    const page = Number(url.searchParams.get("page")) || 1;

    const currentFilters: Record<string, any> = {};
    url.searchParams.forEach((val, key) => {
      if (!["subcategory", "page", "categoryId"].includes(key)) {
        currentFilters[key] = val;
      }
    });

    setActiveSubSlug(subSlug);
    setSelectedFilters(currentFilters);

    const activeSub = subCategories.find((s) => s.slug === subSlug);
    console.log("🖥️ CLIENTE INTENTA FETCH:", {
      buscandoSlug: subSlug,
      encontrada: activeSub ? "SÍ" : "NO",
      idQueSeEnviara: activeSub?.id,
    });

    if (shouldFetch) {
      $isLoading.set(true);

      const apiParams = new URLSearchParams();
      apiParams.set("categoryId", categoryId.toString());
      apiParams.set("page", page.toString());
      if (activeSub) apiParams.set("subcategoryId", activeSub.id.toString());

      Object.entries(currentFilters).forEach(([k, v]) =>
        apiParams.set(k, v as string)
      );

      try {
        const res = await fetch(`/api/shop?${apiParams.toString()}`);
        const result = await res.json();

        $products.set(result.products);
        $totalProducts.set(result.total);
      } catch (e) {
        console.error("Error fetching products:", e);
      } finally {
        $isLoading.set(false);
      }
    }
  };

  useEffect(() => {
    const handlePopState = () => {
      syncStateWithUrl(new URL(window.location.href), true);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);


  const updateUrlAndSync = (url: URL) => {
    window.history.pushState({}, "", url);
    syncStateWithUrl(url, true);
  };

  const handleSubcategoryClick = (slug: string) => {
    const url = new URL(window.location.href);

    if (url.searchParams.get("subcategory") === slug) return;

    url.search = "";
    url.searchParams.set("subcategory", slug);
    url.searchParams.set("page", "1");

    updateUrlAndSync(url);
  };

  const handleFilterChange = (key: string, value: string, checked: boolean) => {
    const url = new URL(window.location.href);

    if (checked) {
      url.searchParams.set(key, value);
    } else {
      url.searchParams.delete(key);
    }
    url.searchParams.set("page", "1");

    updateUrlAndSync(url);
  };

  const handleClearFilters = () => {
    const url = new URL(window.location.href);
    url.search = ""; 
    updateUrlAndSync(url);
  };

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

      {/* Filtro Estático: Disponibilidad */}
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
