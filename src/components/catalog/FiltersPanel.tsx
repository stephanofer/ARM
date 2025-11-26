import type { FilterConfig, Subcategory } from "@/lib/data/types";
import {
  hasActiveFilters,
  resetFilters,
  setAttributeFilter,
} from "@/stores/filtersStore";
import { useStore } from "@nanostores/preact";
import { setSubcategory } from "@/stores/filtersStore";
import styles from "./FiltersPanel.module.css";

export interface FiltersPanelProps {
  filterConfig: FilterConfig[];
  currentFilters: Record<string, string | string[]>;
  subcategories: Subcategory[];
  currentSubcategorySlug: string | null;
}

export function FiltersPanel({
  filterConfig,
  currentFilters,
  currentSubcategorySlug,
  subcategories,
}: FiltersPanelProps) {
  const hasFilters = useStore(hasActiveFilters);

  const handleFilterChange = (key: string, value: string | string[]) => {
    setAttributeFilter(key, value);
  };

  const handleReset = () => {
    console.log("click");
    resetFilters();
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Filtros</h3>
        <button
          className={styles.resetButton}
          onClick={handleReset}
          disabled={!hasFilters}
        >
          Limpiar Todo
        </button>
      </div>

      <div className={styles.filters}>
        {subcategories.length > 0 && (
          <div className={styles.filterGroup}>
            <label className={styles.filterLabel}>Subcategoría</label>
            <select
              className={styles.select}
              value={currentSubcategorySlug || ""}
              onChange={(e) =>
                setSubcategory(
                  e.currentTarget.value === "" ? null : e.currentTarget.value
                )
              }
            >
              <option value="">Todas</option>
              {subcategories.map((subcategory) => (
                <option key={subcategory.id} value={subcategory.slug}>
                  {subcategory.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {filterConfig.map((config) => (
          <div key={config.key} className={styles.filterGroup}>
            <label className={styles.filterLabel}>{config.label}</label>

            {config.type === "select" && config.options && (
              <select
                className={styles.select}
                value={(currentFilters[config.key] as string) || ""}
                onChange={(e) =>
                  handleFilterChange(config.key, e.currentTarget.value)
                }
              >
                <option value="">Todos</option>
                {config.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )}

            {config.type === "checkbox" && config.options && (
              <div className={styles.checkboxGroup}>
                {config.options.map((option) => {
                  const currentValue = currentFilters[config.key];
                  const isChecked = Array.isArray(currentValue)
                    ? currentValue.includes(option)
                    : currentValue === option;

                  return (
                    <label key={option} className={styles.checkbox}>
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          const checked = e.currentTarget.checked;
                          const current = currentFilters[config.key];

                          if (Array.isArray(current)) {
                            const newValue = checked
                              ? [...current, option]
                              : current.filter((v) => v !== option);
                            handleFilterChange(
                              config.key,
                              newValue.length > 0 ? newValue : ""
                            );
                          } else {
                            handleFilterChange(
                              config.key,
                              checked ? option : ""
                            );
                          }
                        }}
                      />
                      <span>{option}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {config.type === "boolean" && (
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={
                    !!currentFilters[config.key] &&
                    currentFilters[config.key] !== "false"
                  }
                  onChange={(e) => {
                    handleFilterChange(
                      config.key,
                      e.currentTarget.checked ? "true" : ""
                    );
                  }}
                />
                <span>Sí</span>
              </label>
            )}

            {config.type === "range" && (
              <div className={styles.rangeGroup}>
                <input
                  type="range"
                  className={styles.range}
                  min={(config as any).min || 0}
                  max={(config as any).max || 100}
                  step={(config as any).step || 1}
                  value={currentFilters[config.key] || (config as any).min || 0}
                  onChange={(e) => {
                    handleFilterChange(config.key, e.currentTarget.value);
                  }}
                />
                <span className={styles.rangeValue}>
                  {currentFilters[config.key] || (config as any).min || 0}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
