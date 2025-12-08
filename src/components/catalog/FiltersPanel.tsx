import type { FilterConfig, Subcategory } from "@/lib/data/types";
import {
  hasActiveFilters,
  resetFilters,
  setAttributeFilter,
  setPriceRange,
  filtersStore,
} from "@/stores/filtersStore";
import { useStore } from "@nanostores/preact";
import { setSubcategory } from "@/stores/filtersStore";
import { useState, useEffect } from "preact/hooks";
import styles from "./FiltersPanel.module.css";

export interface FiltersPanelProps {
  filterConfig: FilterConfig[];
  currentFilters: Record<string, string | string[]>;
  subcategories: Subcategory[];
  currentSubcategorySlug: string | null;
  /** Modo mobile: controla si el drawer está abierto */
  isOpen?: boolean;
  /** Callback para cerrar el drawer en mobile */
  onClose?: () => void;
  /** Precio mínimo de los productos (para el slider) */
  minPriceAvailable?: number;
  /** Precio máximo de los productos (para el slider) */
  maxPriceAvailable?: number;
}

export function FiltersPanel({
  filterConfig,
  currentFilters,
  currentSubcategorySlug,
  subcategories,
  isOpen = false,
  onClose,
  minPriceAvailable = 0,
  maxPriceAvailable = 1000,
}: FiltersPanelProps) {
  const hasFilters = useStore(hasActiveFilters);
  const filters = useStore(filtersStore);
  
  // Estado para controlar qué secciones están colapsadas
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());

  // Estado local para el filtro de precio
  const [localMinPrice, setLocalMinPrice] = useState<number>(filters.minPrice ?? minPriceAvailable);
  const [localMaxPrice, setLocalMaxPrice] = useState<number>(filters.maxPrice ?? maxPriceAvailable);

  // Sincronizar con el store cuando cambian los filtros
  useEffect(() => {
    setLocalMinPrice(filters.minPrice ?? minPriceAvailable);
    setLocalMaxPrice(filters.maxPrice ?? maxPriceAvailable);
  }, [filters.minPrice, filters.maxPrice, minPriceAvailable, maxPriceAvailable]);

  // Bloquear scroll del body cuando el drawer está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleFilterChange = (key: string, value: string | string[]) => {
    setAttributeFilter(key, value);
  };

  const handleReset = () => {
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

  // Contenido de los filtros (reutilizable)
  const filtersContent = (
    <>
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
                  key={subcategory.slug}
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
                            // Ya es array: agregar o quitar del array
                            const newValue = checked
                              ? [...current, option]
                              : current.filter((v) => v !== option);
                            handleFilterChange(
                              config.key,
                              newValue.length > 0 ? newValue : ""
                            );
                          } else if (current && typeof current === 'string') {
                            // Ya hay un valor string: convertir a array
                            if (checked) {
                              // Agregar nuevo valor al existente
                              handleFilterChange(config.key, [current, option]);
                            } else {
                              // Desmarcar el único valor existente
                              handleFilterChange(config.key, "");
                            }
                          } else {
                            // No hay valor previo: establecer como string simple
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

            {config.type === "range" && (() => {
              const min = (config as any).min || 0;
              const max = (config as any).max || 100;
              const step = (config as any).step || 1;
              
              // Parsear el valor actual del filtro (puede ser "60-90" o un número simple)
              let currentMin = min;
              let currentMax = max;
              const currentValue = currentFilters[config.key];
              
              if (typeof currentValue === 'string' && currentValue.includes('-')) {
                const [minStr, maxStr] = currentValue.split('-');
                currentMin = parseInt(minStr) || min;
                currentMax = parseInt(maxStr) || max;
              } else if (currentValue) {
                currentMin = parseInt(currentValue as string) || min;
                currentMax = max;
              }

              return (
                <div className={styles.rangeGroup}>
                  {/* Inputs numéricos */}
                  <div className={styles.rangeInputs}>
                    <input
                      type="number"
                      className={styles.rangeNumberInput}
                      placeholder="Mín"
                      min={min}
                      max={max}
                      step={step}
                      value={currentMin}
                      onChange={(e) => {
                        const val = parseInt(e.currentTarget.value) || min;
                        const newMin = Math.max(min, Math.min(val, currentMax));
                        handleFilterChange(config.key, `${newMin}-${currentMax}`);
                      }}
                    />
                    <span className={styles.rangeSeparator}>-</span>
                    <input
                      type="number"
                      className={styles.rangeNumberInput}
                      placeholder="Máx"
                      min={min}
                      max={max}
                      step={step}
                      value={currentMax}
                      onChange={(e) => {
                        const val = parseInt(e.currentTarget.value) || max;
                        const newMax = Math.min(max, Math.max(val, currentMin));
                        handleFilterChange(config.key, `${currentMin}-${newMax}`);
                      }}
                    />
                  </div>

                  {/* Dual Range Slider */}
                  <div className={styles.dualRangeContainer}>
                    <div className={styles.dualRangeTrack}>
                      <div 
                        className={styles.dualRangeHighlight}
                        style={{
                          left: `${((currentMin - min) / (max - min)) * 100}%`,
                          right: `${100 - ((currentMax - min) / (max - min)) * 100}%`
                        }}
                      />
                    </div>
                    <input
                      type="range"
                      className={styles.dualRangeMin}
                      min={min}
                      max={max}
                      step={step}
                      value={currentMin}
                      onChange={(e) => {
                        const val = parseInt(e.currentTarget.value);
                        if (val <= currentMax) {
                          handleFilterChange(config.key, `${val}-${currentMax}`);
                        }
                      }}
                    />
                    <input
                      type="range"
                      className={styles.dualRangeMax}
                      min={min}
                      max={max}
                      step={step}
                      value={currentMax}
                      onChange={(e) => {
                        const val = parseInt(e.currentTarget.value);
                        if (val >= currentMin) {
                          handleFilterChange(config.key, `${currentMin}-${val}`);
                        }
                      }}
                    />
                  </div>

                  {/* Etiquetas de rango */}
                  <div className={styles.rangeLabels}>
                    <span className={styles.rangeLabelMin}>{min}</span>
                    <span className={styles.rangeLabelCurrent}>
                      {currentMin === min && currentMax === max
                        ? 'Todos'
                        : `${currentMin} - ${currentMax}`}
                    </span>
                    <span className={styles.rangeLabelMax}>{max}</span>
                  </div>
                </div>
              );
            })()}
          </div>
        ))}
      </div>
    </>
  );

  return (
    <>
      {/* Desktop: Panel normal en sidebar */}
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
        {filtersContent}
      </div>

      {/* Mobile: Drawer/Modal */}
      <div 
        className={`${styles.mobileDrawerOverlay} ${isOpen ? styles.open : ''}`}
        onClick={onClose}
        aria-hidden={!isOpen}
      />
      <div 
        className={`${styles.mobileDrawer} ${isOpen ? styles.open : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label="Filtros"
      >
        {/* Header del drawer */}
        <div className={styles.drawerHeader}>
          <h3 className={styles.drawerTitle}>Filtros</h3>
          <button 
            className={styles.drawerClose}
            onClick={onClose}
            aria-label="Cerrar filtros"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Contenido scrolleable */}
        <div className={styles.drawerContent}>
          {filtersContent}
        </div>

        {/* Footer con acciones */}
        <div className={styles.drawerFooter}>
          <button 
            className={styles.drawerClearBtn}
            onClick={handleReset}
            disabled={!hasFilters}
          >
            Limpiar
          </button>
          <button 
            className={styles.drawerApplyBtn}
            onClick={onClose}
          >
            Ver resultados
          </button>
        </div>
      </div>
    </>
  );
}
