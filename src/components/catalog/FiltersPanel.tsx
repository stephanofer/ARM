import type { FilterConfig, Subcategory } from "@/lib/data/types";
import {
  hasActiveFilters,
  resetFilters,
  setAttributeFilter,
} from "@/stores/filtersStore";
import { useStore } from "@nanostores/preact";
import { setSubcategory } from "@/stores/filtersStore";
import { useState } from "preact/hooks";
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
  
  // Estado para controlar qué secciones están colapsadas
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  const handleFilterChange = (key: string, value: string | string[]) => {
    setAttributeFilter(key, value);
  };

  const handleReset = () => {
    console.log("click");
    resetFilters();
  };

  const toggleSection = (sectionKey: string) => {
    setCollapsedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionKey)) {
        newSet.delete(sectionKey);
      } else {
        newSet.add(sectionKey);
      }
      return newSet;
    });
  };

  

  return (
    <div className={styles["filters-sidebar"]}>
      <div className={styles["filters-header"]}>
        <h3 className={styles["filters-title"]}>Filtros</h3>
        <button
          className={styles["clear-filters"]}
          onClick={handleReset}
          disabled={!hasFilters}
        >
          Limpiar Todo
        </button>
      </div>

      <div className={styles.filters}>
        {subcategories.length > 0 && (
          <div className={`${styles["filter-section"]} ${collapsedSections.has('subcategories') ? styles.collapsed : ''}`}>
            <h3 
              className={styles["filter-section-title"]}
              onClick={() => toggleSection('subcategories')}
            >
              <span>Subcategorías</span>
              <svg
                className={styles.chevron}
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </h3>
            <div
              className={
                styles["filter-options"] + " " + styles["subcategories-list"]
              }
            >
              {subcategories.map((subcategory) => (
                <a
                  className={
                    styles["subcategory-link"] + (currentSubcategorySlug === subcategory.slug ? " " + styles.active : "")
                  }
                  onClick={() => setSubcategory(subcategory.slug)}
                >
                  {subcategory.name}
                  <svg
                    className={styles["arrow-icon"]}
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                  >
                    <polyline points="9 18 15 12 9 6"></polyline>
                  </svg>
                </a>
              ))}
            </div>
          </div>
        )}
        {filterConfig.map((config) => (
          <div 
            key={config.key} 
            className={`${styles.filterGroup} ${collapsedSections.has(config.key) ? styles.collapsed : ''}`}
          >
            <label 
              className={styles.filterLabel}
              onClick={() => toggleSection(config.key)}
              style={{ cursor: 'pointer' }}
            >
              {config.label}
            </label>
            

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
