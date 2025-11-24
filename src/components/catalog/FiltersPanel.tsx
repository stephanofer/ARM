import type { FilterConfig } from '../../lib/data';
import { setAttributeFilter, resetFilters, hasActiveFilters } from '../../stores';
import { useStore } from '@nanostores/preact';
import styles from './FiltersPanel.module.css';

export interface FiltersPanelProps {
  filterConfig: FilterConfig[];
  currentFilters: Record<string, string | string[]>;
}

export function FiltersPanel({ filterConfig, currentFilters }: FiltersPanelProps) {
  const hasFilters = useStore(hasActiveFilters);

  const handleFilterChange = (key: string, value: string | string[]) => {
    setAttributeFilter(key, value);
  };

  const handleReset = () => {
    resetFilters();
  };

  if (filterConfig.length === 0) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Filtros</h3>
        {hasFilters && (
          <button className={styles.resetButton} onClick={handleReset}>
            Limpiar
          </button>
        )}
      </div>

      <div className={styles.filters}>
        {filterConfig.map((config) => (
          <div key={config.key} className={styles.filterGroup}>
            <label className={styles.filterLabel}>{config.label}</label>

            {config.type === 'select' && config.options && (
              <select
                className={styles.select}
                value={(currentFilters[config.key] as string) || ''}
                onChange={(e) => handleFilterChange(config.key, e.currentTarget.value)}
              >
                <option value="">Todos</option>
                {config.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            )}

            {config.type === 'checkbox' && config.options && (
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
                            handleFilterChange(config.key, newValue.length > 0 ? newValue : '');
                          } else {
                            handleFilterChange(config.key, checked ? option : '');
                          }
                        }}
                      />
                      <span>{option}</span>
                    </label>
                  );
                })}
              </div>
            )}

            {config.type === 'boolean' && (
              <label className={styles.checkbox}>
                <input
                  type="checkbox"
                  checked={!!currentFilters[config.key] && currentFilters[config.key] !== 'false'}
                  onChange={(e) => {
                    handleFilterChange(config.key, e.currentTarget.checked ? 'true' : '');
                  }}
                />
                <span>Sí</span>
              </label>
            )}

            {config.type === 'range' && (
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
